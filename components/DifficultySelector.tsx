// src/components/DifficultySelector.tsx - Fixed design with unified color scheme

"use client";

import { useState } from "react";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { GameDifficulty } from "../types/game";
import { GAME_CONFIGS } from "../utils/gameUtils";

interface DifficultySelectorProps {
  onSelectDifficulty: (difficulty: GameDifficulty) => void;
  selectedDifficulty: GameDifficulty | null;
  onPlay: () => void;
  onBack: () => void;
}

export default function DifficultySelector({
  onSelectDifficulty,
  selectedDifficulty,
  onPlay,
  onBack,
}: DifficultySelectorProps) {
  const [expandedMode, setExpandedMode] = useState<GameDifficulty | null>(null);
  const difficulties = Object.values(GameDifficulty);

  const getDifficultyIcon = (difficulty: GameDifficulty) => {
    switch (difficulty) {
      case GameDifficulty.LEGENDARY:
        return Award; // BEGINNER
      case GameDifficulty.OMG:
        return Flame; // INTERMEDIATE
      case GameDifficulty.NIGHTMARE:
        return Skull; // ADVANCED
      case GameDifficulty.IMPOSSIBLE:
        return Crown; // EXPERT
      case GameDifficulty.PRECISION:
        return Crosshair; // SURVIVAL
      default:
        return Target;
    }
  };

  const getDifficultyLevel = (difficulty: GameDifficulty): number => {
    switch (difficulty) {
      case GameDifficulty.LEGENDARY:
        return 1; // BEGINNER
      case GameDifficulty.OMG:
        return 2; // INTERMEDIATE
      case GameDifficulty.NIGHTMARE:
        return 3; // ADVANCED
      case GameDifficulty.IMPOSSIBLE:
        return 4; // EXPERT
      case GameDifficulty.PRECISION:
        return 5; // SURVIVAL (Special)
      default:
        return 1;
    }
  };

  const getDifficultyDisplayName = (difficulty: GameDifficulty): string => {
    switch (difficulty) {
      case GameDifficulty.LEGENDARY:
        return "BEGINNER";
      case GameDifficulty.OMG:
        return "INTERMEDIATE";
      case GameDifficulty.NIGHTMARE:
        return "ADVANCED";
      case GameDifficulty.IMPOSSIBLE:
        return "EXPERT";
      case GameDifficulty.PRECISION:
        return "SURVIVAL";
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

  const getDifficultySpecialNote = (
    difficulty: GameDifficulty,
  ): string | null => {
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
      case 25:
        return "5×5";
      case 36:
        return "6×6";
      case 49:
        return "7×7";
      default:
        return `${circleCount}`;
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
              className={`w-2 h-1 rounded-full transition-all duration-300 ${
                i <= level
                  ? "bg-red-400 shadow-sm shadow-red-400/50"
                  : "bg-white/20"
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
            className={`w-2 h-1 rounded-full transition-all duration-300 ${
              i <= level ? "bg-white" : "bg-white/20"
            }`}
          />
        ))}
      </div>
    );
  };

  const toggleExpanded = (difficulty: GameDifficulty) => {
    setExpandedMode(expandedMode === difficulty ? null : difficulty);
  };

  const selectDifficulty = (difficulty: GameDifficulty) => {
    onSelectDifficulty(difficulty);
  };

  const renderModeCard = (difficulty: GameDifficulty) => {
    const config = GAME_CONFIGS[difficulty];
    const isSelected = selectedDifficulty === difficulty;
    const isExpanded = expandedMode === difficulty;
    const Icon = getDifficultyIcon(difficulty);
    const level = getDifficultyLevel(difficulty);
    const isPrecision = isPrecisionMode(difficulty);

    return (
      <div
        key={difficulty}
        className={`
          backdrop-blur-sm overflow-hidden border-2 rounded-2xl font-bpdots 
          transition-all duration-500
          ${
            isSelected
              ? "bg-white/15 border-white/60"
              : "bg-white/5 border-white/20"
          }
          ${isExpanded ? "shadow-lg shadow-black/20" : ""}
        `}
      >
        {/* Header - Always Visible */}
        <button
          className={`
            w-full p-4 text-left transition-all duration-300
            hover:bg-white/5
          `}
          onClick={() => toggleExpanded(difficulty)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
                ${isSelected ? "bg-white/20 scale-110" : "bg-white/10"}
              `}
              >
                <Icon
                  className="text-white transition-colors duration-300"
                  size={20}
                />
              </div>

              <div>
                <h3
                  className={`text-lg font-bold tracking-wide transition-colors duration-300 ${
                    isSelected ? "text-white" : "text-white/90"
                  }`}
                >
                  {getDifficultyDisplayName(difficulty)}
                </h3>
                <p className="text-sm text-white/60">
                  {getDifficultyDescription(difficulty)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Difficulty Level Indicator */}
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider mb-1 text-white/40">
                  {isPrecision ? "Danger" : "Level"}
                </div>
                {renderDifficultyBar(level, isPrecision)}
              </div>

              {/* Expand/Collapse Icon */}
              <div className="text-white/60">
                {isExpanded ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Selection Button */}
        <div className="px-4 pb-2">
          <button
            className={`
              w-full py-2 px-4 rounded-lg font-bpdots text-sm font-bold transition-all duration-300
              ${
                isSelected
                  ? "bg-white/20 text-white border border-white/40"
                  : "bg-white/10 text-white/80 hover:bg-white/15 border border-white/20"
              }
            `}
            onClick={() => selectDifficulty(difficulty)}
          >
            {isSelected ? "✓ SELECTED" : "SELECT"}
          </button>
        </div>

        {/* Expanded Content */}
        <div
          className={`
          transition-all duration-500 ease-in-out overflow-hidden
          ${isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
        `}
        >
          <div className="px-4 pb-4 border-t border-white/10">
            {isPrecision ? (
              /* Precision Mode Details */
              <div className="space-y-4 pt-4">
                {/* Danger Warning Banner */}
                <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
                  <div className="text-xs font-bold text-red-200 text-center tracking-wider mb-2">
                    ⚠️ EXTREME PRECISION REQUIRED ⚠️
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-200">
                      {getGridDescription(difficulty)}
                    </div>
                    <div className="text-xs text-red-300/60 uppercase tracking-wider">
                      Grid Size
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-200">15</div>
                    <div className="text-xs text-red-300/60 uppercase tracking-wider">
                      Levels
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-200">1</div>
                    <div className="text-xs text-red-300/60 uppercase tracking-wider">
                      Life
                    </div>
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
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-red-400/20 border border-red-400/30 rounded-full text-xs text-red-200">
                    <Clock className="inline mr-1" size={10} />
                    8S INTERVALS
                  </span>
                  <span className="px-3 py-1 bg-red-400/20 border border-red-400/30 rounded-full text-xs text-red-200">
                    <AlertTriangle className="inline mr-1" size={10} />
                    NO MERCY
                  </span>
                  <span className="px-3 py-1 bg-red-400/20 border border-red-400/30 rounded-full text-xs text-red-200">
                    <Target className="inline mr-1" size={10} />
                    PURE SKILL
                  </span>
                </div>
              </div>
            ) : (
              /* Standard Mode Details */
              <div className="space-y-4 pt-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {getGridDescription(difficulty)}
                    </div>
                    <div className="text-xs text-white/50 uppercase tracking-wider">
                      Grid
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {config.maxSimultaneousCircles}
                    </div>
                    <div className="text-xs text-white/50 uppercase tracking-wider">
                      Max Active
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {config.circleActiveTime}ms
                    </div>
                    <div className="text-xs text-white/50 uppercase tracking-wider">
                      Duration
                    </div>
                  </div>
                </div>

                {/* Special Note */}
                {getDifficultySpecialNote(difficulty) && (
                  <div className="bg-white/10 border border-white/20 rounded-lg p-3">
                    <div className="text-xs font-bpdots text-white/80 uppercase tracking-wider mb-1 text-center">
                      Mode Details
                    </div>
                    <p className="text-white/60 font-bpdots text-xs text-center italic">
                      {getDifficultySpecialNote(difficulty)}
                    </p>
                  </div>
                )}

                {/* Special Features */}
                {(config.decoyProbability > 0 || config.adaptiveScaling) && (
                  <div className="flex flex-wrap gap-2">
                    {config.decoyProbability > 0 && (
                      <span className="px-3 py-1 bg-white/15 rounded-full text-xs text-white/80">
                        Decoy: {Math.round(config.decoyProbability * 100)}%
                      </span>
                    )}
                    {config.adaptiveScaling && (
                      <span className="px-3 py-1 bg-white/15 rounded-full text-xs text-white/80">
                        <Zap className="inline mr-1" size={10} />
                        Adaptive
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-6">
          <div className="text-center space-y-3">
            <div className="relative">
              <h2 className="text-3xl font-bold font-bpdots text-white tracking-wider">
                SELECT MODE
              </h2>
              <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-1 w-12 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
            <p className="text-white/60 font-bpdots text-sm uppercase tracking-widest">
              Choose your challenge level
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Content with scroll shadows */}
      <div className="relative flex-1 pt-32">
        {/* Top scroll shadow */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/90 via-black/60 via-black/30 to-transparent z-20 pointer-events-none" />

        {/* Bottom scroll shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/90 via-black/60 via-black/30 to-transparent z-20 pointer-events-none" />

        {/* Scrollable content */}
        <div className="h-full px-6 pb-52 overflow-y-auto">
          <div className="space-y-4 animate-fade-in pt-2">
            {difficulties.map((difficulty) => renderModeCard(difficulty))}
          </div>
        </div>
      </div>

      {/* Fixed Footer Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-black/90 backdrop-blur-sm border-t border-white/10">
        <div className="px-6 py-6">
          <div className="space-y-4">
            <button
              className={`
                w-full px-8 py-4 border-2 rounded-xl font-bpdots text-xl font-bold
                transition-all duration-300 
                ${
                  selectedDifficulty
                    ? "bg-transparent border-white text-white hover:bg-white/10 hover:scale-105 active:scale-95 cursor-pointer"
                    : "bg-transparent border-white/30 text-white/30 cursor-not-allowed"
                }
              `}
              disabled={!selectedDifficulty}
              onClick={onPlay}
            >
              PLAY
            </button>

            <button
              className="w-full px-6 py-3 bg-transparent border-2 border-white/60 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white hover:text-white transition-all duration-300"
              onClick={onBack}
            >
              BACK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
