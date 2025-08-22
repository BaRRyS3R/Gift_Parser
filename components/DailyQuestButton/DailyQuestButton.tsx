// src/components/DailyQuestButton/DailyQuestButton.tsx - Future Tech Design (без свечения)

import React, { useEffect, useRef } from "react";
import { Target, CheckCircle, Zap, Star } from "lucide-react";

import { useDailyQuests } from "@/hooks/modules/useDailyQuests";
import { useT } from "@/contexts/LocalizationContext";

interface DailyQuestButtonProps {
  isTransitioning: boolean;
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>;
  onClick: () => void;
}

export default function DailyQuestButton({
  isTransitioning,
  makeAuthenticatedRequest,
  onClick,
}: DailyQuestButtonProps) {
  const t = useT();
  const {
    quest,
    hasActiveQuest,
    isCompleted,
    progressPercentage,
    fetchDailyQuest,
  } = useDailyQuests(makeAuthenticatedRequest);

  // Используем ref для предотвращения повторных вызовов
  const hasFetchedRef = useRef(false);

  // Load quest data on mount - только один раз
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDailyQuest();
    }
  }, []);

  // Don't render button if no quest is available
  if (!hasActiveQuest) {
    return null;
  }

  const getButtonContent = () => {
    if (isCompleted) {
      return {
        icon: <CheckCircle className="text-emerald-300" size={20} />,
        secondaryIcon: <Star className="text-yellow-300" size={16} />,
        text: t("quests.button.completed"),
        bgGradient: "from-emerald-500/30 via-green-500/20 to-emerald-600/30",
        borderGradient: "from-emerald-300 via-green-400 to-emerald-500",
        glowColor: "emerald-400",
        textColor: "text-emerald-200",
        shadowColor: "shadow-emerald-500/20",
      };
    }

    return {
      icon: <Target className="text-cyan-300" size={20} />,
      secondaryIcon: <Zap className="text-blue-300" size={16} />,
      text: t("quests.button.active"),
      bgGradient: "from-cyan-500/30 via-blue-500/20 to-purple-600/30",
      borderGradient: "from-cyan-300 via-blue-400 to-purple-500",
      glowColor: "cyan-400",
      textColor: "text-cyan-200",
      shadowColor: "shadow-cyan-500/20",
    };
  };

  const buttonContent = getButtonContent();

  return (
    <div className="relative group">
      {/* Main button container */}
      <button
        aria-label={t("quests.button.aria")}
        className={`relative w-auto px-6 py-3 h-14 bg-gradient-to-br ${buttonContent.bgGradient} backdrop-blur-lg border border-transparent text-white rounded-xl transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${buttonContent.shadowColor} group`}
        disabled={isTransitioning}
        onClick={onClick}
        style={{
          background: `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.8) 100%)`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Animated border */}
        <div 
          className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
          style={{
            background: `linear-gradient(90deg, transparent, ${isCompleted ? '#10b981' : '#06b6d4'}, transparent)`,
            backgroundSize: '200% 100%',
            animation: 'borderScan 2s linear infinite',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            padding: '1px',
          }}
        />

        {/* Holographic overlay */}
        <div 
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
          style={{
            background: `linear-gradient(45deg, 
              transparent 30%, 
              rgba(255,255,255,0.1) 50%, 
              transparent 70%)`,
            backgroundSize: '200% 200%',
            animation: 'hologram 3s ease-in-out infinite',
          }}
        />

        {/* Main content container */}
        <div className="relative z-10 flex items-center space-x-4">
          {/* Icon cluster */}
          <div className="relative flex items-center justify-center">
            {/* Primary icon */}
            <div className="relative">
              {buttonContent.icon}
            </div>
            
            {/* Secondary icon for decoration */}
            <div className="absolute -top-1 -right-1 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
              {buttonContent.secondaryIcon}
            </div>
          </div>

          {/* Content section */}
          <div className="flex flex-col items-start min-w-0">
            {/* Main text */}
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-mono font-bold tracking-wider ${buttonContent.textColor} whitespace-nowrap group-hover:text-white transition-colors duration-300`}>
                {buttonContent.text}
              </span>
              
              {/* Status indicator */}
              <div className={`w-2 h-2 rounded-full bg-${buttonContent.glowColor} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} 
                   style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>

            {/* Progress section for active quests */}
            {!isCompleted && (
              <div className="flex items-center space-x-3 mt-2 w-full">
                {/* Progress bar */}
                <div className="relative w-16 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/10">
                  {/* Background track */}
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-600/30 to-gray-500/30" />
                  
                  {/* Progress fill */}
                  <div
                    className={`absolute top-0 left-0 h-full bg-gradient-to-r from-${buttonContent.glowColor} to-blue-400 transition-all duration-700 ease-out rounded-full`}
                    style={{ 
                      width: `${progressPercentage}%`,
                    }}
                  />
                </div>
                
                {/* Percentage display */}
                <span className="text-xs text-white/70 font-mono font-bold min-w-[2.5rem] text-right">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            )}

            {/* Completion effects */}
            {isCompleted && (
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-emerald-300/80 font-mono tracking-wide">
                  MISSION COMPLETE
                </span>
                {/* Celebration particles */}
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 h-1 bg-yellow-400 rounded-full opacity-60"
                      style={{
                        animation: `sparkle 1.5s ease-in-out infinite ${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scanning line effect */}
        <div
          className="absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-80 transition-opacity duration-500"
          style={{
            background: `linear-gradient(90deg, transparent, ${isCompleted ? '#10b981' : '#06b6d4'}, transparent)`,
            animation: 'scanLine 2.5s ease-in-out infinite',
          }}
        />

        {/* Bottom edge highlight */}
        <div
          className="absolute bottom-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-60 transition-opacity duration-500"
          style={{
            background: `linear-gradient(90deg, transparent, ${isCompleted ? '#34d399' : '#22d3ee'}, transparent)`,
            animation: 'scanLine 2.5s ease-in-out infinite reverse',
          }}
        />
      </button>
    </div>
  );
}