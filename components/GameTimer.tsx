// src/components/GameTimer.tsx - Complete simplified interface for Precision Mode

"use client";

import { formatTime, formatPrecisionTime } from "../utils/gameUtils";

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
    // Simplified Precision Mode Timer - только время выживания
    return (
      <div className="flex flex-col items-center">
        <div className="text-2xl font-bold font-bpdots text-white">
          {formatPrecisionTime(survivalTime)}
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