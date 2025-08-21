// src/components/DailyQuestButton/DailyQuestButton.tsx

import React, { useEffect } from "react";
import { Target, CheckCircle, Clock } from "lucide-react";
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

  // Load quest data on mount
  useEffect(() => {
    fetchDailyQuest();
  }, [fetchDailyQuest]);

  // Don't render button if no quest is available
  if (!hasActiveQuest) {
    return null;
  }

  const getButtonContent = () => {
    if (isCompleted) {
      return {
        icon: <CheckCircle className="text-green-400" size={18} />,
        text: t("quests.button.completed"),
        bgColor: "bg-green-500/20",
        borderColor: "border-green-400/50",
        hoverBg: "hover:bg-green-500/30",
        textColor: "text-green-300",
      };
    }

    return {
      icon: <Target className="text-cyan-400" size={18} />,
      text: t("quests.button.active"),
      bgColor: "bg-cyan-500/20",
      borderColor: "border-cyan-400/50", 
      hoverBg: "hover:bg-cyan-500/30",
      textColor: "text-cyan-300",
    };
  };

  const buttonContent = getButtonContent();

  return (
    <button
      aria-label={t("quests.button.aria")}
      className={`group relative w-auto px-4 h-12 ${buttonContent.bgColor} backdrop-blur-sm border ${buttonContent.borderColor} text-white rounded-lg ${buttonContent.hoverBg} transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden`}
      disabled={isTransitioning}
      onClick={onClick}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Main content */}
      <div className="relative z-10 flex items-center space-x-3">
        {/* Icon */}
        <div className="flex items-center justify-center">
          {buttonContent.icon}
        </div>

        {/* Text and progress */}
        <div className="flex flex-col items-start min-w-0">
          <span className={`text-sm font-mono tracking-wider ${buttonContent.textColor} whitespace-nowrap`}>
            {buttonContent.text}
          </span>
          
          {/* Progress indicator for active quests */}
          {!isCompleted && (
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-12 bg-white/20 rounded-full h-1 overflow-hidden">
                <div
                  className="h-1 bg-cyan-400 transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-xs text-white/60 font-mono">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          )}
        </div>

        {/* Completion indicator */}
        {isCompleted && (
          <div className="flex items-center justify-center w-3 h-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Hover effect glow */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 bg-cyan-500/20 rounded-lg blur-sm" />
      </div>

      {/* External glow on hover */}
      <div
        className="absolute -inset-1 rounded-lg blur-sm opacity-0 group-hover:opacity-50 transition-opacity duration-300 bg-gradient-to-br from-cyan-500/40 to-cyan-600/20"
        style={{ zIndex: -1 }}
      />

      {/* Scanning line for future tech effect */}
      <div
        className="absolute top-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
        style={{ animation: "shimmer 2s ease-in-out infinite" }}
      />
    </button>
  );
}
