// src/app/game/page.tsx - Enhanced Game Mode Selection with improved design

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Crosshair,
  Timer,
  Target,
  Trophy,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Info,
  X,
  CheckCircle,
  Users,
  Activity,
  Sparkles,
  Shield,
} from "lucide-react";

interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  route: string;
  difficulty: "Medium" | "Extreme";
  duration: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    border: string;
    glow: string;
  };
  features: string[];
  detailedInfo: {
    objective: string;
    rules: string[];
    tips: string[];
    scoring: string;
  };
}

const GAME_MODES: GameMode[] = [
  {
    id: "reaction",
    name: "REACTION SPEED",
    description: "Test your lightning-fast reflexes",
    icon: Zap,
    route: "/game/reaction",
    difficulty: "Medium",
    duration: "~10 seconds",
    color: {
      primary: "text-white",
      secondary: "text-white/90",
      accent: "text-white/80",
      background: "bg-white/10",
      border: "border-white/30",
      glow: "shadow-white/20",
    },
    features: [
      "Single target precision",
      "Random timing (3-5s)",
      "Speed measurement",
      "Performance ratings",
    ],
    detailedInfo: {
      objective: "Click the target circle as quickly as possible when it appears to measure your reaction time.",
      rules: [
        "A single circle will appear after a random delay (3-5 seconds)",
        "Click the circle as fast as possible when it appears",
        "Only successful clicks are recorded to the leaderboard",
        "The faster your reaction, the higher your score",
        "Maximum wait time: 10 seconds before timeout"
      ],
      tips: [
        "Stay focused and ready during the waiting period",
        "Don't anticipate - react only when you see the target",
        "Use your dominant hand for faster response",
        "Maintain a comfortable hand position",
        "Practice regularly to improve your reflexes"
      ],
      scoring: "Score is calculated based on reaction time: Lightning (≤150ms) = 1.5x bonus, Excellent (≤200ms) = 1.3x bonus, Good (≤300ms) = 1.1x bonus. Base score = 1000 - reaction_time_ms."
    }
  },
  {
    id: "survival",
    name: "SURVIVAL MODE",
    description: "Survive escalating precision challenges",
    icon: Crosshair,
    route: "/game/survival",
    difficulty: "Extreme",
    duration: "Until failure",
    color: {
      primary: "text-red-400",
      secondary: "text-red-300",
      accent: "text-red-200",
      background: "bg-red-500/20",
      border: "border-red-400/30",
      glow: "shadow-red-500/30",
    },
    features: [
      "15 escalating levels",
      "Multiple targets",
      "Trap circles (red)",
      "One mistake = death",
    ],
    detailedInfo: {
      objective: "Survive as long as possible by clicking white circles while avoiding red trap circles in increasingly difficult levels.",
      rules: [
        "Click only white circles - they disappear when clicked correctly",
        "Never click red circles - they are traps that end your game",
        "Never click inactive (gray) circles - this also ends your game",
        "Missing a white circle timeout also ends your game",
        "Progress through 15 levels with increasing difficulty",
        "Each level increases speed, targets, and complexity"
      ],
      tips: [
        "Focus on accuracy over speed - one mistake ends everything",
        "Track multiple targets simultaneously",
        "Develop peripheral vision awareness",
        "Stay calm as intensity increases",
        "Learn to distinguish colors quickly under pressure"
      ],
      scoring: "Base score = survival_time_seconds + (perfect_streak × 3) + (level_reached × 15). Higher levels and longer streaks provide exponential bonuses."
    }
  },
];

export default function GamePage() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedModeForInfo, setSelectedModeForInfo] = useState<GameMode | null>(null);

  const handleModeStart = (mode: GameMode) => {
    setIsTransitioning(true);

    setTimeout(() => {
      router.push(mode.route);
    }, 600);
  };

  const handleBackToMenu = () => {
    router.push("/main");
  };

  const handleShowInfo = (mode: GameMode) => {
    setSelectedModeForInfo(mode);
  };

  const handleCloseInfo = () => {
    setSelectedModeForInfo(null);
  };

  const renderModeCard = (mode: GameMode) => {
    const Icon = mode.icon;
    const isReaction = mode.id === "reaction";

    return (
      <div
        key={mode.id}
        className={`
          group relative w-full backdrop-blur-xl overflow-hidden border-2 rounded-3xl font-bpdots 
          transition-all duration-700 ease-out transform hover:scale-[1.02] hover:-translate-y-2
          ${mode.color.background} ${mode.color.border} hover:border-opacity-80
          hover:shadow-2xl ${mode.color.glow}
        `}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full border border-current animate-pulse"></div>
          <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full border border-current animate-pulse delay-1000"></div>
        </div>

        {/* Difficulty badge */}
        <div className="absolute top-4 right-4 z-10">
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm
            ${mode.difficulty === "Extreme"
              ? "bg-red-500/30 border border-red-400/50 text-red-300"
              : "bg-white/20 border border-white/30 text-white/80"
            }`}>
            {mode.difficulty === "Extreme" ? (
              <AlertTriangle size={12} />
            ) : (
              <Sparkles size={12} />
            )}
            <span>{mode.difficulty}</span>
          </div>
        </div>

        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center space-x-6 mb-6">
            <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110
              ${mode.color.background} border-2 ${mode.color.border}`}>
              <Icon size={32} className={`${mode.color.primary} transition-all duration-500 group-hover:scale-110`} />

              {/* Icon glow effect */}
              <div className={`absolute inset-0 rounded-2xl blur-md opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${mode.color.background}`}></div>
            </div>

            <div className="flex-1">
              <h3 className={`text-2xl font-bold tracking-wide mb-2 ${mode.color.primary} transition-colors duration-300`}>
                {mode.name}
              </h3>
              <p className={`text-sm ${mode.color.secondary} leading-relaxed`}>
                {mode.description}
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {mode.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3 group/feature">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 group-hover/feature:scale-125
                  ${isReaction ? "bg-white/60" : "bg-red-400/80"}`}></div>
                <span className={`text-sm transition-colors duration-300 group-hover/feature:text-opacity-100
                  ${mode.color.secondary}`}>
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Duration */}
          <div className="flex items-center space-x-2 mb-8">
            <Clock className={`${mode.color.accent}`} size={16} />
            <span className={`text-sm font-medium ${mode.color.accent}`}>
              Duration: {mode.duration}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={() => handleModeStart(mode)}
              disabled={isTransitioning}
              className={`
                group/btn flex-1 relative py-4 px-6 rounded-2xl font-bpdots text-lg font-bold 
                transition-all duration-500 text-center overflow-hidden
                ${mode.color.background} ${mode.color.primary} ${mode.color.border} border-2
                hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                hover:shadow-lg transform hover:-translate-y-1
              `}
              type="button"
              aria-label={`Start ${mode.name} game mode`}
            >
              {/* Button background effect */}
              <div className={`absolute inset-0 opacity-0 group-hover/btn:opacity-20 transition-opacity duration-500 ${mode.color.background}`}></div>

              <div className="relative flex items-center justify-center space-x-2">
                {isReaction ? <Zap size={20} /> : <Shield size={20} />}
                <span>{isTransitioning ? "LOADING..." : "START"}</span>
              </div>
            </button>

            <button
              onClick={() => handleShowInfo(mode)}
              disabled={isTransitioning}
              className="relative px-4 py-4 rounded-2xl font-bpdots text-lg font-bold transition-all duration-500 bg-white/10 text-white/80 border-2 border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/info"
              type="button"
              aria-label={`About ${mode.name} game mode`}
            >
              <Info size={20} className="transition-transform duration-300 group-hover/info:rotate-12" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderInfoModal = () => {
    if (!selectedModeForInfo) return null;

    const mode = selectedModeForInfo;
    const Icon = mode.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl animate-fade-in">
          {/* Header */}
          <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${mode.color.background}`}>
                  <Icon size={24} className={mode.color.primary} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold font-bpdots ${mode.color.primary}`}>
                    {mode.name}
                  </h2>
                  <p className="text-sm text-white/60 font-bpdots">
                    {mode.description}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseInfo}
                className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300"
                aria-label="Close information modal"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Objective */}
            <div>
              <h3 className="text-lg font-bold font-bpdots text-white mb-3 flex items-center space-x-2">
                <Target className="text-white/80" size={18} />
                <span>OBJECTIVE</span>
              </h3>
              <p className="text-white/80 leading-relaxed">
                {mode.detailedInfo.objective}
              </p>
            </div>

            {/* Rules */}
            <div>
              <h3 className="text-lg font-bold font-bpdots text-white mb-3 flex items-center space-x-2">
                <CheckCircle className="text-white/80" size={18} />
                <span>RULES</span>
              </h3>
              <div className="space-y-2">
                {mode.detailedInfo.rules.map((rule, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 mt-2 flex-shrink-0"></div>
                    <span className="text-white/70 text-sm leading-relaxed">{rule}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-lg font-bold font-bpdots text-white mb-3 flex items-center space-x-2">
                <Zap className="text-white/80" size={18} />
                <span>PRO TIPS</span>
              </h3>
              <div className="space-y-2">
                {mode.detailedInfo.tips.map((tip, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${mode.id === "reaction" ? "bg-white/60" : "bg-red-400/60"
                      }`}></div>
                    <span className="text-white/70 text-sm leading-relaxed">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scoring */}
            <div>
              <h3 className="text-lg font-bold font-bpdots text-white mb-3 flex items-center space-x-2">
                <Trophy className="text-white/80" size={18} />
                <span>SCORING SYSTEM</span>
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-white/70 text-sm leading-relaxed">
                  {mode.detailedInfo.scoring}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold font-bpdots text-white mb-1">
                  {mode.difficulty}
                </div>
                <div className="text-xs font-bpdots text-white/60 uppercase tracking-wider">
                  Difficulty
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold font-bpdots text-white mb-1">
                  {mode.duration}
                </div>
                <div className="text-xs font-bpdots text-white/60 uppercase tracking-wider">
                  Duration
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  handleCloseInfo();
                  handleModeStart(mode);
                }}
                disabled={isTransitioning}
                className={`
                  flex-1 py-4 px-6 rounded-xl font-bpdots text-lg font-bold transition-all duration-300
                  ${mode.color.background} ${mode.color.primary} ${mode.color.border} border
                  hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                START PLAYING
              </button>
              <button
                onClick={handleCloseInfo}
                className="px-6 py-4 rounded-xl font-bpdots text-lg font-bold bg-white/10 text-white/80 border border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden safe-area-inset ${isTransitioning
        ? "opacity-0 transition-opacity duration-500 ease-in"
        : "opacity-100 transition-opacity duration-1000 ease-out"
        }`}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-2 h-48 bg-white/5 rotate-12 animate-pulse"></div>
        <div className="absolute top-40 right-32 w-2 h-32 bg-white/5 -rotate-12 animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-16 w-2 h-56 bg-white/5 rotate-12 animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-20 w-2 h-40 bg-white/5 -rotate-12 animate-pulse delay-500"></div>

        {/* Floating circles */}
        <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-white/10 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-white/15 rounded-full animate-bounce delay-700"></div>
        <div className="absolute bottom-1/4 right-1/4 w-3 h-3 bg-white/10 rounded-full animate-bounce delay-1000"></div>
      </div>

      <div className="text-center z-20 space-y-16 flex flex-col items-center justify-center max-w-6xl px-6 w-full">
        {/* Header */}
        <div className="relative space-y-6">
          <div className="relative">
            <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-bpdots tracking-widest text-white mb-4 animate-fade-in">
              MODE
            </h1>

            {/* Decorative elements around title */}
            <div className="absolute -left-8 top-1/2 transform -translate-y-1/2">
              <div className="w-12 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
            </div>
            <div className="absolute -right-8 top-1/2 transform -translate-y-1/2">
              <div className="w-12 h-px bg-gradient-to-l from-transparent via-white/40 to-transparent"></div>
            </div>
          </div>

          <p className="text-white/60 font-bpdots text-sm uppercase tracking-[0.3em] animate-fade-in">
            Choose your challenge
          </p>
        </div>

        {/* Game Mode Cards */}
        <div className="w-full space-y-8">
          <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
            {GAME_MODES.map(renderModeCard)}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-12 animate-fade-in">
          <button
            onClick={handleBackToMenu}
            disabled={isTransitioning}
            className="group flex items-center space-x-3 px-8 py-4 bg-transparent border-2 border-white/30 text-white/80 rounded-2xl font-bpdots text-lg hover:bg-white/5 hover:border-white/50 hover:text-white transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            aria-label="Return to main menu"
          >
            <ArrowLeft size={24} className="transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="tracking-wider">BACK TO MENU</span>
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {renderInfoModal()}
    </div>
  );
}