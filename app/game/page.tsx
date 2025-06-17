// src/app/game/page.tsx - Enhanced with server-side validation and unlimited attempts display

"use client";

import { useState, useEffect, useCallback } from "react";
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
  Play,
  Shield,
  Battery,
} from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { userService, type AttemptsStatus } from "@/lib/supabase";

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
    description: "Test your lightning-fast reflexes with precision timing",
    icon: Zap,
    route: "/game/reaction",
    difficulty: "Medium",
    duration: "~10 seconds",
    color: {
      primary: "text-white",
      secondary: "text-white/90",
      accent: "text-white/80",
      background: "bg-white/5",
      border: "border-white/20",
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
    description: "Survive escalating precision challenges with deadly traps",
    icon: Crosshair,
    route: "/game/survival",
    difficulty: "Extreme",
    duration: "Until failure",
    color: {
      primary: "text-red-400",
      secondary: "text-red-300",
      accent: "text-red-200",
      background: "bg-red-500/5",
      border: "border-red-400/20",
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

const AttemptsDisplay = ({
  attemptsStatus,
  timeUntilReset
}: {
  attemptsStatus: AttemptsStatus;
  timeUntilReset: string;
}) => {
  const attemptsRemaining = attemptsStatus.attemptsRemaining;
  const isEmpty = attemptsRemaining === 0;
  const isLow = attemptsRemaining <= 2 && attemptsRemaining > 0;

  // Dynamic battery level calculation
  const getBatteryLevel = () => {
    if (attemptsRemaining <= 0) return 0;
    if (attemptsRemaining <= 5) return (attemptsRemaining / 5) * 100;
    return 100; // Full battery for 5+ attempts
  };

  const getBatteryColor = () => {
    if (isEmpty) return "text-red-400";
    if (isLow) return "text-orange-400";
    return "text-green-400";
  };

  const getBatteryBgColor = () => {
    if (isEmpty) return "bg-red-500/20 border-red-400/40";
    if (isLow) return "bg-orange-500/20 border-orange-400/40";
    return "bg-white/10 border-white/30";
  };

  return (
    <div className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ${getBatteryBgColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Battery className={getBatteryColor()} size={18} />
          <span className={`text-sm font-bold ${getBatteryColor()}`}>
            ATTEMPTS
          </span>
        </div>
        <span className={`text-lg font-bold ${getBatteryColor()}`}>
          {attemptsRemaining}
        </span>
      </div>

      <div className="mb-3">
        <div className={`w-full h-2 rounded-full overflow-hidden ${isEmpty
          ? "bg-red-400/20"
          : isLow
            ? "bg-orange-400/20"
            : "bg-white/20"
          }`}>
          <div
            className={`h-full transition-all duration-500 ${getBatteryColor().replace('text-', 'bg-')}`}
            style={{ width: `${getBatteryLevel()}%` }}
          />
        </div>

        {/* Attempt indicators - show up to 10, then just display number */}
        {attemptsRemaining <= 10 ? (
          <div className="flex justify-between mt-1">
            {Array.from({ length: Math.min(10, Math.max(5, attemptsRemaining)) }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i < attemptsRemaining
                  ? getBatteryColor().replace('text-', 'bg-')
                  : "bg-white/20"
                  }`}
              />
            ))}
          </div>
        ) : (
          <div className="text-center mt-1">
            <span className={`text-xs ${getBatteryColor()}`}>
              {attemptsRemaining} TOTAL
            </span>
          </div>
        )}
      </div>

      {timeUntilReset && isEmpty && (
        <div className="text-center space-y-1">
          <div className="text-xs text-white/60 uppercase tracking-wider">
            Next reset in
          </div>
          <div className="text-lg font-bold text-green-400">
            {timeUntilReset}
          </div>
        </div>
      )}

      <div className="text-center mt-2">
        {isEmpty && (
          <p className="text-xs text-red-400/80">
            All attempts used - wait for reset
          </p>
        )}
        {isLow && !isEmpty && (
          <p className="text-xs text-orange-400/80">
            Low attempts - use wisely
          </p>
        )}
        {attemptsRemaining > 5 && (
          <p className="text-xs text-green-400/80">
            Plenty of attempts available
          </p>
        )}
      </div>
    </div>
  );
};

export default function GamePage() {
  const router = useRouter();
  const { telegramUser } = useUser();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedModeForInfo, setSelectedModeForInfo] = useState<GameMode | null>(null);
  const [attemptsStatus, setAttemptsStatus] = useState<AttemptsStatus>({
    canPlay: true,
    attemptsRemaining: 0,
  });
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");
  const [isLoadingAttempts, setIsLoadingAttempts] = useState(true);

  const checkAttempts = useCallback(async () => {
    if (!telegramUser?.id) return;

    try {
      setIsLoadingAttempts(true);
      const status = await userService.checkAndUpdateAttemptsWithServerValidation(telegramUser.id);
      setAttemptsStatus(status);
    } catch (error) {
      console.error("Error checking attempts:", error);
    } finally {
      setIsLoadingAttempts(false);
    }
  }, [telegramUser?.id]);

  useEffect(() => {
    checkAttempts();
  }, [checkAttempts]);

  useEffect(() => {
    if (!attemptsStatus.resetTime || attemptsStatus.canPlay) {
      setTimeUntilReset("");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = attemptsStatus.resetTime!.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilReset("");
        checkAttempts();
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeUntilReset(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attemptsStatus.resetTime, attemptsStatus.canPlay, checkAttempts]);

  const handleModeStart = (mode: GameMode) => {
    if (!attemptsStatus.canPlay) return;

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
    const isDisabled = !attemptsStatus.canPlay;

    return (
      <div
        key={mode.id}
        className={`
          relative w-full max-w-sm mx-auto backdrop-blur-sm border rounded-2xl 
          transition-all duration-300 
          ${isDisabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:scale-[1.02] hover:shadow-xl cursor-pointer"
          }
          ${mode.color.background} ${mode.color.border} 
          ${isDisabled ? "" : "hover:border-opacity-60"}
          bg-black/20 
          ${isDisabled ? "" : "hover:bg-black/30"}
        `}
      >
        <div className="p-8">
          <div className="text-center mb-6">
            <h3 className={`text-2xl font-bold tracking-wide ${mode.color.primary} mb-2`}>
              {mode.name}
            </h3>
            <div className="w-12 h-px bg-gradient-to-r from-transparent via-current to-transparent mx-auto opacity-40"></div>
          </div>

          <div className="space-y-6 mb-8">
            <p className={`text-sm leading-relaxed text-center ${mode.color.secondary}`}>
              {mode.description}
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className={`${mode.color.accent}`} size={14} />
                  <span className={`text-xs font-medium ${mode.color.accent}`}>
                    {mode.duration}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {mode.difficulty === "Extreme" ? (
                    <AlertTriangle className="text-red-400" size={14} />
                  ) : (
                    <Target className={`${mode.color.accent}`} size={14} />
                  )}
                  <span className={`text-xs font-medium ${mode.difficulty === "Extreme" ? "text-red-400" : mode.color.accent
                    }`}>
                    {mode.difficulty}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {mode.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-1 h-1 rounded-full ${isReaction ? "bg-white/60" : "bg-red-400/80"
                      }`}></div>
                    <span className={`text-xs ${mode.color.secondary}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-current to-transparent mx-auto opacity-20 mb-6"></div>

          <div className="flex space-x-3">
            <button
              onClick={() => handleModeStart(mode)}
              disabled={isTransitioning || isDisabled}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl 
                text-sm font-bold transition-all duration-300
                ${mode.color.background} ${mode.color.primary} ${mode.color.border} border
                ${isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:scale-105 active:scale-95 hover:shadow-lg hover:border-opacity-80"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              type="button"
              aria-label={`Start ${mode.name} game mode`}
            >
              <Play size={16} />
              <span>
                {isTransitioning
                  ? "LOADING..."
                  : isDisabled
                    ? "NO ATTEMPTS"
                    : "PLAY"
                }
              </span>
            </button>

            <button
              onClick={() => handleShowInfo(mode)}
              disabled={isTransitioning}
              className="px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 bg-white/5 text-white/70 border border-white/20 hover:bg-white/10 hover:border-white/30 hover:text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
              aria-label={`About ${mode.name} game mode`}
            >
              <Info size={16} />
            </button>
          </div>
        </div>

        {isDisabled && (
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
            <div className="text-center space-y-2">
              <Shield className="text-white/60 mx-auto" size={24} />
              <p className="text-white/80 text-sm font-bold">
                NO ATTEMPTS LEFT
              </p>
            </div>
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl animate-fade-in">
          <div className="sticky top-0 bg-black/95 backdrop-blur-sm border-b border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${mode.color.background}`}>
                  <Icon size={24} className={mode.color.primary} />
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${mode.color.primary}`}>
                    {mode.name}
                  </h2>
                  <p className="text-sm text-white/60">
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

          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                <Target className="text-white/80" size={18} />
                <span>OBJECTIVE</span>
              </h3>
              <p className="text-white/80 leading-relaxed">
                {mode.detailedInfo.objective}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
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

            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
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

            <div>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center space-x-2">
                <Trophy className="text-white/80" size={18} />
                <span>SCORING SYSTEM</span>
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-white/70 text-sm leading-relaxed">
                  {mode.detailedInfo.scoring}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {mode.difficulty}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wider">
                  Difficulty
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {mode.duration}
                </div>
                <div className="text-xs text-white/60 uppercase tracking-wider">
                  Duration
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  handleCloseInfo();
                  handleModeStart(mode);
                }}
                disabled={isTransitioning || !attemptsStatus.canPlay}
                className={`
                  flex-1 py-4 px-6 rounded-xl text-lg font-bold transition-all duration-300
                  ${mode.color.background} ${mode.color.primary} ${mode.color.border} border
                  ${!attemptsStatus.canPlay
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:scale-105 active:scale-95"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {!attemptsStatus.canPlay ? "NO ATTEMPTS LEFT" : "START PLAYING"}
              </button>
              <button
                onClick={handleCloseInfo}
                className="px-6 py-4 rounded-xl text-lg font-bold bg-white/10 text-white/80 border border-white/20 hover:bg-white/15 hover:border-white/40 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingAttempts) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white">CHECKING ATTEMPTS...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative safe-area-inset ${isTransitioning
        ? "opacity-0 transition-opacity duration-500 ease-in"
        : "opacity-100 transition-opacity duration-1000 ease-out"
        }`}
    >
      <div className="text-center z-20 space-y-12 flex flex-col items-center justify-center max-w-6xl px-6 w-full">
        {/* Header */}
        <div className="relative space-y-4">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-widest text-white animate-fade-in">
            MODE
          </h1>
          <p className="text-white/60 text-sm uppercase tracking-[0.3em] animate-fade-in">
            Choose your challenge
          </p>
        </div>

        {/* Attempts Display */}
        <div className="w-full max-w-md animate-fade-in">
          <AttemptsDisplay
            attemptsStatus={attemptsStatus}
            timeUntilReset={timeUntilReset}
          />
        </div>

        {/* Game Mode Cards */}
        <div className="w-full space-y-8">
          <div className="grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
            {GAME_MODES.map(renderModeCard)}
          </div>
        </div>

        {/* Attempts Info */}
        {!attemptsStatus.canPlay && (
          <div className="animate-fade-in max-w-md mx-auto">
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-400/30 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <AlertTriangle className="text-red-400" size={18} />
                <span className="text-sm font-bold text-red-300">
                  ALL ATTEMPTS USED
                </span>
              </div>
              <p className="text-red-400/80 text-xs">
                Wait for automatic reset or purchase more attempts
              </p>
              {timeUntilReset && (
                <p className="text-green-400 text-sm font-bold mt-2">
                  Reset in: {timeUntilReset}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-12 animate-fade-in">
          <button
            onClick={handleBackToMenu}
            disabled={isTransitioning}
            className="group flex items-center space-x-3 px-8 py-4 bg-transparent border border-white/30 text-white/80 rounded-2xl text-lg hover:bg-white/5 hover:border-white/50 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
            aria-label="Return to main menu"
          >
            <ArrowLeft size={20} className="transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="tracking-wider">BACK TO MENU</span>
          </button>
        </div>

        {/* Footer Info */}
        <div className="text-center space-y-2 animate-fade-in">
          <p className="text-white/40 text-xs">
            • Attempts reset automatically after 2 minutes •
          </p>
          <p className="text-white/30 text-xs">
            Use your attempts wisely - each game counts!
          </p>
        </div>
      </div>

      {/* Info Modal */}
      {renderInfoModal()}
    </div>
  );
}