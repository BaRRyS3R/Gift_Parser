// src/app/game/page.tsx - Enhanced Game Mode Selection with monochrome reaction mode

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
      // Updated to monochrome scheme
      primary: "text-white",
      secondary: "text-white/90",
      accent: "text-white/80",
      background: "bg-white/10",
      border: "border-white/30",
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

    return (
      <div
        key={mode.id}
        className={`
          relative w-full backdrop-blur-sm overflow-hidden border-2 rounded-2xl font-bpdots 
          transition-all duration-500 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40
        `}
      >
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/10">
              <Icon size={24} className="text-white" />
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-bold tracking-wide text-white">
                {mode.name}
              </h3>
              <p className="text-sm text-white/60">
                {mode.description}
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase tracking-wider mb-1 text-white/40">
                {mode.difficulty}
              </div>
              <div className="text-xs text-white/60">
                {mode.duration}
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {mode.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-1 h-1 rounded-full bg-white/40"></div>
                <span className="text-xs text-white/70">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => handleModeStart(mode)}
              disabled={isTransitioning}
              className={`
                flex-1 py-3 px-4 rounded-lg font-bpdots text-sm font-bold transition-all duration-300 text-center
                ${mode.color.background} ${mode.color.primary} ${mode.color.border} border
                hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
              `}
              type="button"
              aria-label={`Start ${mode.name} game mode`}
            >
              {isTransitioning ? "LOADING..." : "START"}
            </button>

            <button
              onClick={() => handleShowInfo(mode)}
              disabled={isTransitioning}
              className="px-4 py-3 rounded-lg font-bpdots text-sm font-bold transition-all duration-300 bg-white/10 text-white/80 border border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              aria-label={`About ${mode.name} game mode`}
            >
              <Info size={16} />
            </button>
          </div>
        </div>

        {mode.difficulty === "Extreme" && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <AlertTriangle size={16} className="text-red-400" />
          </div>
        )}
      </div>
    );
  };

  const renderInfoModal = () => {
    if (!selectedModeForInfo) return null;

    const mode = selectedModeForInfo;
    const Icon = mode.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl">
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
      className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden ${isTransitioning
        ? "opacity-0 transition-opacity duration-500 ease-in"
        : "opacity-100 transition-opacity duration-1000 ease-out"
        }`}
    >
      <div className="text-center z-20 space-y-12 flex flex-col items-center justify-center max-w-4xl px-6">
        <div className="relative mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-bpdots tracking-widest text-white mb-4">
            SELECT GAME MODE
          </h1>
          <p className="text-white/60 font-bpdots text-sm uppercase tracking-widest">
            Choose your challenge level
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {GAME_MODES.map(renderModeCard)}
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleBackToMenu}
            disabled={isTransitioning}
            className="flex items-center space-x-2 px-6 py-3 bg-transparent border-2 border-white/40 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white/60 hover:text-white focus:bg-white/5 focus:border-white/60 focus:text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            aria-label="Return to main menu"
          >
            <ArrowLeft size={20} />
            <span>BACK TO MENU</span>
          </button>
        </div>
      </div>

      {/* Corner Frame Elements */}
      <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-white/20 z-20"></div>
      <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-white/20 z-20"></div>
      <div className="absolute bottom-24 left-8 w-12 h-12 border-l-2 border-b-2 border-white/20 z-20"></div>
      <div className="absolute bottom-24 right-8 w-12 h-12 border-r-2 border-b-2 border-white/20 z-20"></div>

      {/* Info Modal */}
      {renderInfoModal()}
    </div>
  );
}