// src/app/game/page.tsx - Game Mode Selection Page

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Crosshair, Timer, Target, Trophy, AlertTriangle, Clock, ArrowLeft } from 'lucide-react';

interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  route: string;
  difficulty: 'Medium' | 'Extreme';
  duration: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    border: string;
  };
  features: string[];
}

const GAME_MODES: GameMode[] = [
  {
    id: 'reaction',
    name: 'REACTION SPEED',
    description: 'Test your lightning-fast reflexes',
    icon: Zap,
    route: '/game/reaction',
    difficulty: 'Medium',
    duration: '~10 seconds',
    color: {
      primary: 'text-yellow-400',
      secondary: 'text-yellow-300',
      accent: 'text-yellow-200',
      background: 'bg-yellow-500/20',
      border: 'border-yellow-400/30'
    },
    features: [
      'Single target precision',
      'Random timing (3-5s)',
      'Speed measurement',
      'Performance ratings'
    ]
  },
  {
    id: 'survival',
    name: 'SURVIVAL MODE',
    description: 'Survive escalating precision challenges',
    icon: Crosshair,
    route: '/game/survival',
    difficulty: 'Extreme',
    duration: 'Until failure',
    color: {
      primary: 'text-red-400',
      secondary: 'text-red-300',
      accent: 'text-red-200',
      background: 'bg-red-500/20',
      border: 'border-red-400/30'
    },
    features: [
      '15 escalating levels',
      'Multiple targets',
      'Trap circles (red)',
      'One mistake = death'
    ]
  }
];

export default function GamePage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode.id);
    setIsTransitioning(true);

    setTimeout(() => {
      router.push(mode.route);
    }, 600);
  };

  const handleBackToMenu = () => {
    router.push('/main');
  };

  const renderModeCard = (mode: GameMode) => {
    const Icon = mode.icon;
    const isSelected = selectedMode === mode.id;

    return (
      <div
        key={mode.id}
        className={`
          backdrop-blur-sm overflow-hidden border-2 rounded-2xl font-bpdots 
          transition-all duration-500 cursor-pointer group
          ${isSelected
            ? `${mode.color.background} ${mode.color.border} scale-105`
            : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/40 hover:scale-105'
          }
        `}
        onClick={() => handleModeSelect(mode)}
      >
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className={`
              w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300
              ${isSelected
                ? mode.color.background
                : 'bg-white/10 group-hover:bg-white/20'
              }
            `}>
              <Icon size={24} className={isSelected ? mode.color.primary : 'text-white'} />
            </div>

            <div className="flex-1">
              <h3 className={`text-xl font-bold tracking-wide transition-colors duration-300 ${isSelected ? mode.color.primary : 'text-white group-hover:text-white'
                }`}>
                {mode.name}
              </h3>
              <p className={`text-sm ${isSelected ? mode.color.secondary : 'text-white/60 group-hover:text-white/80'
                }`}>
                {mode.description}
              </p>
            </div>

            <div className="text-right">
              <div className={`text-xs uppercase tracking-wider mb-1 ${isSelected ? mode.color.accent : 'text-white/40'
                }`}>
                {mode.difficulty}
              </div>
              <div className={`text-xs ${isSelected ? mode.color.secondary : 'text-white/60'
                }`}>
                {mode.duration}
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {mode.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className={`w-1 h-1 rounded-full ${isSelected ? mode.color.primary : 'bg-white/40'
                  }`}></div>
                <span className={`text-xs ${isSelected ? mode.color.accent : 'text-white/70'
                  }`}>
                  {feature}
                </span>
              </div>
            ))}
          </div>

          <button
            className={`
              w-full py-3 px-4 rounded-lg font-bpdots text-sm font-bold transition-all duration-300
              ${isSelected
                ? `${mode.color.background} ${mode.color.primary} ${mode.color.border} border`
                : 'bg-white/10 text-white/80 hover:bg-white/15 border border-white/20'
              }
            `}
            disabled={isTransitioning}
          >
            {isTransitioning && isSelected ? 'LOADING...' : 'PLAY NOW'}
          </button>
        </div>

        {mode.difficulty === 'Extreme' && (
          <div className="absolute top-3 right-3">
            <AlertTriangle size={16} className="text-red-400" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden ${isTransitioning
        ? 'opacity-0 transition-opacity duration-500 ease-in'
        : 'opacity-100 transition-opacity duration-1000 ease-out'
      }`}>

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
            className="flex items-center space-x-2 px-6 py-3 bg-transparent border-2 border-white/40 text-white/80 rounded-xl font-bpdots text-lg hover:bg-white/5 hover:border-white/60 hover:text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={20} />
            <span>BACK TO MENU</span>
          </button>
        </div>
      </div>

      <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-white/20 z-20"></div>
      <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-white/20 z-20"></div>
      <div className="absolute bottom-24 left-8 w-12 h-12 border-l-2 border-b-2 border-white/20 z-20"></div>
      <div className="absolute bottom-24 right-8 w-12 h-12 border-r-2 border-b-2 border-white/20 z-20"></div>
    </div>
  );
}