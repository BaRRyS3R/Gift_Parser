// src/app/game/page.tsx - Sarcastic Game Selection Experience

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Skull, Target, AlertTriangle, Coffee, Brain } from "lucide-react";

import { GameDifficulty } from "@/types/game";
import DifficultySelector from "@/components/DifficultySelector";
import GameManager from "@/components/GameManager";

export default function GamePage() {
  const router = useRouter();
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<GameDifficulty | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const handleSelectDifficulty = (difficulty: GameDifficulty) => {
    setSelectedDifficulty(difficulty);
  };

  const handleStartGame = () => {
    if (!selectedDifficulty) return;
    setGameStarted(true);
  };

  const handleBackToMenu = () => {
    router.push("/main");
  };

  const handleBackToDifficultySelection = () => {
    setGameStarted(false);
    setSelectedDifficulty(null);
  };

  // Саркастичные тексты для кнопок
  const getPlayButtonText = () => {
    if (!selectedDifficulty) return "SELECT YOUR DOOM FIRST";

    switch (selectedDifficulty) {
      case GameDifficulty.LEGENDARY:
        return "COMMENCE GENTLE SUFFERING";
      case GameDifficulty.OMG:
        return "BEGIN MODERATE TORMENT";
      case GameDifficulty.NIGHTMARE:
        return "INITIATE REAL PAIN";
      case GameDifficulty.IMPOSSIBLE:
        return "EMBRACE COMPLETE DESPAIR";
      case GameDifficulty.PRECISION:
        return "ACTIVATE PSYCHOLOGICAL WARFARE";
      default:
        return "START THE MADNESS";
    }
  };

  const getBackButtonText = () => {
    if (hoveredButton === "back") {
      return "RETREAT TO SAFETY";
    }
    return "ESCAPE WHILE YOU CAN";
  };

  const getDifficultyWarning = () => {
    if (!selectedDifficulty) return null;

    const warnings = {
      [GameDifficulty.LEGENDARY]: {
        icon: Coffee,
        text: "⚠️ Warning: May cause false sense of accomplishment",
        color: "text-green-400"
      },
      [GameDifficulty.OMG]: {
        icon: Target,
        text: "⚠️ Caution: Actual skill required beyond this point",
        color: "text-orange-400"
      },
      [GameDifficulty.NIGHTMARE]: {
        icon: Brain,
        text: "⚠️ Danger: May cause temporary loss of sanity",
        color: "text-purple-400"
      },
      [GameDifficulty.IMPOSSIBLE]: {
        icon: Skull,
        text: "⚠️ EXTREME: Have therapist on speed dial",
        color: "text-yellow-400"
      },
      [GameDifficulty.PRECISION]: {
        icon: AlertTriangle,
        text: "☠️ LETHAL: One mistake = instant existential crisis",
        color: "text-red-400"
      }
    };

    const warning = warnings[selectedDifficulty];
    const Icon = warning.icon;

    return (
      <div className={`bg-black/30 border rounded-lg p-4 backdrop-blur-xl ${selectedDifficulty === GameDifficulty.PRECISION
          ? 'border-red-400/30 bg-red-500/10'
          : 'border-white/20'
        }`}>
        <div className="flex items-center space-x-3">
          <Icon size={20} className={warning.color} />
          <p className={`font-bpdots text-sm ${warning.color}`}>
            {warning.text}
          </p>
        </div>
      </div>
    );
  };

  const getSarcasticMotivation = () => {
    const motivations = [
      "Remember: Everyone starts as a failure! 🎯",
      "Fun fact: 99% of players quit before getting good! 📊",
      "Tip: The circles are supposed to be clicked! 💡",
      "Pro advice: Try not to embarrass yourself too much! 😅",
      "Reminder: Your mouse won't click itself! 🖱️",
      "Note: Rage quitting is always an option! 🚪",
      "Fact: This game has ruined more egos than social media! 📱💔"
    ];

    return motivations[Math.floor(Math.random() * motivations.length)];
  };

  if (gameStarted && selectedDifficulty) {
    return (
      <GameManager
        difficulty={selectedDifficulty}
        onBackToMenu={handleBackToDifficultySelection}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 pb-24">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-16 bg-red-500/20 rotate-45"></div>
        <div className="absolute top-40 right-20 w-2 h-12 bg-orange-500/20 -rotate-12"></div>
        <div className="absolute bottom-32 left-20 w-2 h-20 bg-red-500/20 rotate-12"></div>
        <div className="absolute bottom-20 right-10 w-2 h-14 bg-orange-500/20 -rotate-45"></div>

        {/* Floating warning symbols */}
        <div className="absolute top-1/4 left-1/4 text-red-500/20 animate-pulse">
          <Skull size={16} />
        </div>
        <div className="absolute top-1/3 right-1/3 text-orange-500/20 animate-pulse" style={{ animationDelay: '0.5s' }}>
          <AlertTriangle size={16} />
        </div>
        <div className="absolute bottom-1/4 right-1/4 text-red-500/20 animate-pulse" style={{ animationDelay: '1s' }}>
          <Target size={16} />
        </div>
      </div>

      <div className="w-full max-w-md space-y-8 animate-fade-in relative z-10">
        {/* Header with extra dramatic flair */}
        <div className="text-center space-y-4">
          <div className="relative">
            <h1 className="text-4xl font-bold font-bpdots text-white tracking-wider">
              PREPARE FOR BATTLE
            </h1>
            <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-2 w-20 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent"></div>
          </div>
          <p className="text-white/60 font-bpdots text-sm uppercase tracking-widest">
            (Spoiler alert: You're going to lose)
          </p>

          {/* Random sarcastic motivation */}
          <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-3">
            <p className="text-orange-300/80 font-bpdots text-xs italic">
              💭 {getSarcasticMotivation()}
            </p>
          </div>
        </div>

        {/* Difficulty Selector */}
        <DifficultySelector
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={handleSelectDifficulty}
        />

        {/* Warning Message */}
        {selectedDifficulty && (
          <div className="animate-fade-in">
            {getDifficultyWarning()}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Play Button */}
          <button
            className={`
              group relative w-full px-8 py-4 border-2 rounded-xl font-bpdots text-xl 
              transition-all duration-300 overflow-hidden
              ${selectedDifficulty
                ? selectedDifficulty === GameDifficulty.PRECISION
                  ? "bg-transparent border-red-400 text-red-300 hover:bg-red-500/10 hover:scale-105 active:scale-95 cursor-pointer"
                  : "bg-transparent border-white text-white hover:bg-white/10 hover:scale-105 active:scale-95 cursor-pointer"
                : "bg-transparent border-white/30 text-white/30 cursor-not-allowed"
              }
            `}
            disabled={!selectedDifficulty}
            onClick={handleStartGame}
            onMouseEnter={() => setHoveredButton("play")}
            onMouseLeave={() => setHoveredButton(null)}
          >
            {/* Background pattern for precision mode */}
            {selectedDifficulty === GameDifficulty.PRECISION && (
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-16 h-16 border border-red-400/30 rounded-full animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 border border-red-400/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </div>
            )}

            <span className="relative z-10 tracking-wider">
              {getPlayButtonText()}
            </span>

            {/* Pulsing effect for precision mode */}
            {selectedDifficulty === GameDifficulty.PRECISION && (
              <div className="absolute inset-0 border-2 border-red-400/30 rounded-xl animate-pulse"></div>
            )}
          </button>

          {/* Back Button */}
          <button
            className="w-full px-6 py-3 bg-transparent border-2 border-white/60 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white hover:text-white transition-all duration-300 hover:scale-105 active:scale-95"
            onClick={handleBackToMenu}
            onMouseEnter={() => setHoveredButton("back")}
            onMouseLeave={() => setHoveredButton(null)}
          >
            {getBackButtonText()}
          </button>
        </div>

        {/* Bottom disclaimer */}
        <div className="text-center">
          <p className="text-white/20 font-bpdots text-xs italic">
            * No refunds for damaged pride or broken dreams
          </p>
        </div>

        {/* Extra sarcastic note for precision mode */}
        {selectedDifficulty === GameDifficulty.PRECISION && (
          <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <Skull size={16} className="text-red-400" />
                <span className="text-red-300 font-bpdots text-sm font-bold">
                  FINAL WARNING
                </span>
                <Skull size={16} className="text-red-400" />
              </div>
              <p className="text-red-400/80 font-bpdots text-xs">
                Precision Mode has a 99.9% failure rate.<br />
                The 0.1% are probably cheating.
              </p>
              <p className="text-red-500/60 font-bpdots text-xs italic">
                "Abandon hope, all ye who click here" - Dante (probably)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}