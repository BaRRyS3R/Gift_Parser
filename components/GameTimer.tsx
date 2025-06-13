// src/components/GameTimer.tsx - Updated for New Precision Mode System

"use client";

import { formatTime, formatPrecisionTime } from "../utils/gameUtils";
import { Clock, Zap, AlertTriangle, Target } from "lucide-react";

interface GameTimerProps {
  timeLeft?: number;
  totalTime?: number;
  isActive: boolean;
  // Precision Mode specific props
  isPrecisionMode?: boolean;
  survivalTime?: number;
  intensityLevel?: number;
  intensityDescription?: string;
}

export default function GameTimer({
  timeLeft = 0,
  totalTime = 30,
  isActive,
  isPrecisionMode = false,
  survivalTime = 0,
  intensityLevel = 1,
  intensityDescription = "WARMING UP",
}: GameTimerProps) {
  if (isPrecisionMode) {
    return (
      <div className="flex flex-col items-center space-y-2">
        {/* Survival Time Display */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <Clock size={14} className="text-red-400" />
            <span className="text-xs font-bpdots text-red-300/80 uppercase tracking-wider">
              SURVIVAL
            </span>
          </div>
          <div className="text-2xl font-bold font-bpdots text-white">
            {formatPrecisionTime(survivalTime)}
          </div>
        </div>

        {/* Intensity Level Display */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <Zap size={14} className="text-orange-400" />
            <span className="text-xs font-bpdots text-orange-300/80 uppercase tracking-wider">
              INTENSITY
            </span>
          </div>
          <div className="text-lg font-bold font-bpdots text-orange-400">
            Level {intensityLevel}
          </div>
          <div className="text-xs font-bpdots text-orange-300/60 uppercase tracking-wider">
            {intensityDescription}
          </div>
        </div>

        {/* Danger Indicator */}
        <div className="flex items-center space-x-2 bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-1">
          <AlertTriangle size={10} className="text-red-400" />
          <span className="text-xs font-bpdots text-red-300 uppercase tracking-wider">
            ONE MISTAKE = DEATH
          </span>
        </div>

        {/* Level Progress Indicator */}
        <div className="w-32 h-1 bg-red-900/20 rounded-full overflow-hidden border border-red-400/30">
          <div
            className="h-full bg-gradient-to-r from-orange-400 via-red-400 to-red-600 transition-all duration-500 ease-out relative"
            style={{
              width: `${Math.min(100, (intensityLevel / 15) * 100)}%`,
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          </div>
        </div>

        {/* Level Indicator */}
        <div className="text-center">
          <div className="text-xs font-bpdots text-red-400/60">
            {intensityLevel}/15 LEVELS
          </div>
        </div>
      </div>
    );
  }

  // Standard Mode Timer
  const progress = (timeLeft / totalTime) * 100;
  const isLowTime = timeLeft <= 10;

  return (
    <div className="flex flex-col items-center space-y-2">
      <div
        className={`
          text-3xl font-bold font-bpdots transition-colors duration-300
          ${isLowTime ? "text-red-400" : "text-white"}
          ${isLowTime && isActive ? "animate-pulse" : ""}
        `}
      >
        {formatTime(timeLeft)}
      </div>

      {/* Standard Mode Progress Bar */}
      <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
        <div
          className={`
            h-full transition-all duration-1000 ease-linear
            ${isLowTime ? "bg-red-400" : "bg-white"}
          `}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}