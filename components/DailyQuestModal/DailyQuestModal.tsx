// src/components/DailyQuestModal/DailyQuestModal.tsx - Fixed null checks and types

import React, { useState, useEffect } from "react";
import { X, Target, Clock, Star, CheckCircle, AlertCircle } from "lucide-react";
import { useDailyQuests } from "@/hooks/modules/useDailyQuests";
import { useT } from "@/contexts/LocalizationContext";

interface DailyQuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  makeAuthenticatedRequest: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<Response>;
}

export default function DailyQuestModal({
  isOpen,
  onClose,
  makeAuthenticatedRequest,
}: DailyQuestModalProps) {
  const t = useT();
  const {
    quest,
    isLoading,
    error,
    lastCompletion,
    hasActiveQuest,
    isCompleted,
    progressPercentage,
    fetchDailyQuest,
    getQuestContent,
    clearError,
    clearLastCompletion,
  } = useDailyQuests(makeAuthenticatedRequest);

  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  // Load quest data when modal opens
  useEffect(() => {
    if (isOpen && !quest) {
      fetchDailyQuest();
    }
  }, [isOpen, quest, fetchDailyQuest]);

  // Show completion message when quest is completed
  useEffect(() => {
    if (lastCompletion && lastCompletion.completed) {
      setShowCompletionMessage(true);
      const timer = setTimeout(() => {
        setShowCompletionMessage(false);
        clearLastCompletion();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastCompletion, clearLastCompletion]);

  // Create a safe translation function that handles missing keys
  const safeT = (key: string, params?: any): string => {
    try {
      return (t as any)(key, params) || key; // Fallback to key if translation not found
    } catch {
      return key; // Return key if translation function fails
    }
  };

  const questContent = quest ? getQuestContent(safeT) : null;

  const getQuestIcon = () => {
    if (!quest) return <Target className="text-white/60" size={20} />;

    switch (quest.quest.quest_type) {
      case "play_games":
        return <Target className="text-blue-400" size={20} />;
      case "score_points":
        return <Star className="text-yellow-400" size={20} />;
      case "hit_circles":
        return <Clock className="text-green-400" size={20} />;
      default:
        return <Target className="text-white/60" size={20} />;
    }
  };

  const getGameModeColor = () => {
    if (!quest) return "text-white/60";

    switch (quest.quest.game_mode) {
      case "reaction":
        return "text-white";
      case "survival":
        return "text-red-400";
      case "physics":
        return "text-purple-400";
      case "rotation":
        return "text-orange-400";
      case "any":
        return "text-cyan-400";
      default:
        return "text-white/60";
    }
  };

  const getProgressBarColor = () => {
    if (isCompleted) return "bg-green-400";
    if (progressPercentage > 50) return "bg-yellow-400";
    return "bg-blue-400";
  };

  const getGameModeName = () => {
    if (!quest) return "";
    
    if (quest.quest.game_mode === "any") {
      return safeT("quests.modal.anyMode");
    }
    
    return safeT(`game.modes.${quest.quest.game_mode}.name`);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-label="Close modal"
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300 cursor-pointer"
        role="button"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-black/90 backdrop-blur-xl border-2 border-white/30 text-white w-full max-w-md relative overflow-hidden"
          style={{
            clipPath: "polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)",
          }}
        >
          {/* Semi-transparent background overlay */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 p-6 pb-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <h2 className="text-xl font-mono tracking-[0.15em] uppercase">
                  {safeT("quests.modal.title")}
                </h2>
              </div>
              <button
                className="w-8 h-8 border border-white/40 bg-white/5 hover:bg-white/10 transition-all duration-300 flex items-center justify-center"
                style={{
                  clipPath:
                    "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)",
                }}
                onClick={onClose}
              >
                <X className="text-white" size={14} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 p-6">
            {/* Completion Message */}
            {showCompletionMessage && lastCompletion && (
              <div className="mb-6 bg-green-500/20 border border-green-400/30 rounded-lg p-4 animate-fade-in">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-green-300 font-bold text-sm">
                    {safeT("quests.modal.questCompleted")}
                  </span>
                </div>
                <div className="text-green-400/80 text-xs">
                  {safeT("quests.modal.attemptsAwarded", {
                    attempts: lastCompletion.attemptsAwarded,
                  })}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white/70 font-mono text-sm tracking-wider">
                  {safeT("quests.modal.loading")}
                </p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <AlertCircle className="text-red-400" size={20} />
                  <p className="text-red-400 font-mono text-sm tracking-wider">
                    {safeT("quests.modal.error")}
                  </p>
                </div>
                <p className="text-white/60 text-xs mb-4">{error}</p>
                <button
                  className="px-4 py-2 bg-red-400/20 border border-red-400/30 text-red-300 rounded text-xs hover:bg-red-400/30 transition-colors"
                  onClick={() => {
                    clearError();
                    fetchDailyQuest(true);
                  }}
                >
                  {safeT("common.retry")}
                </button>
              </div>
            )}

            {/* No Quest State */}
            {!isLoading && !error && !hasActiveQuest && (
              <div className="text-center py-8">
                <Target className="text-white/40 mx-auto mb-3" size={32} />
                <h3 className="text-lg font-mono tracking-wider text-white mb-2">
                  {safeT("quests.modal.noQuest")}
                </h3>
                <p className="text-white/70 text-sm max-w-sm mx-auto">
                  {safeT("quests.modal.noQuestDescription")}
                </p>
              </div>
            )}

            {/* Quest Display */}
            {!isLoading && !error && hasActiveQuest && quest && questContent && (
              <div className="space-y-6">
                {/* Quest Header */}
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    {getQuestIcon()}
                    <h3 className="text-lg font-mono tracking-wider text-white">
                      {questContent.title}
                    </h3>
                  </div>
                  <p className="text-white/70 text-sm">
                    {questContent.description}
                  </p>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                {/* Game Mode */}
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-white/60 text-sm font-mono">
                    {safeT("quests.modal.gameMode")}
                  </span>
                  <span className={`text-sm font-mono uppercase ${getGameModeColor()}`}>
                    {getGameModeName()}
                  </span>
                </div>

                {/* Progress Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 text-sm font-mono">
                      {safeT("quests.modal.progress")}
                    </span>
                    <span className="text-white text-sm font-mono">
                      {questContent.progressText}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 ${getProgressBarColor()} transition-all duration-500 ease-out`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  {/* Completion Status */}
                  {isCompleted ? (
                    <div className="flex items-center justify-center space-x-2 p-3 bg-green-500/20 border border-green-400/30 rounded-lg">
                      <CheckCircle className="text-green-400" size={16} />
                      <span className="text-green-300 text-sm font-mono">
                        {questContent.completedText}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-white/5 border border-white/20 rounded-lg">
                      <span className="text-cyan-400 text-sm font-mono">
                        {questContent.rewardText}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quest Tips */}
                <div className="text-center">
                  <p className="text-white/50 text-xs font-mono">
                    {safeT("quests.modal.autoProgress")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}