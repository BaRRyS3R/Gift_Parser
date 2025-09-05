// src/components/Profile/AchievementsModal.tsx - Enhanced with fullscreen mode and Telegram back button

"use client";

import type {
  UserProfileGameStats,
  UserRankings,
  Achievement,
  UserAchievementsData,
} from "@/hooks/modules/useProfile";

import React, { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";
import {
  Trophy,
  Users,
  Gamepad2,
  Zap,
  Gift,
  Lock,
  Sparkles,
  Hash,
  Cat,
  Wand2,
} from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements?: UserAchievementsData;
  user?: UserProfileGameStats | null;
  rankings?: UserRankings;
}

// Map achievement IDs to their icon components - UPDATED with Easter Egg icons
const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<any>> = {
  // Regular achievements
  first_game: Trophy,
  all_modes_player: Gamepad2,
  super_recruiter: Users,
  lightning_reflexes: Zap,

  // NEW: Easter Egg achievements
  binary_easter_egg: Hash, // 🔢 Binary symbol
  cat_easter_egg: Cat, // 🐱 Cat icon
  winx_easter_egg: Wand2, // 🧚‍♀️ Magic wand for fairy
};

// Future tech color schemes - UPDATED with Easter Egg colors
const ACHIEVEMENT_COLORS: Record<
  string,
  {
    gradient: string;
    border: string;
    glow: string;
    icon: string;
    progressBar: string;
  }
> = {
  // Regular achievements
  first_game: {
    gradient: "from-cyan-500/20 to-blue-600/20",
    border: "border-cyan-500/30",
    glow: "hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]",
    icon: "text-cyan-400",
    progressBar: "bg-gradient-to-r from-cyan-500 to-blue-500",
  },
  all_modes_player: {
    gradient: "from-purple-500/20 to-pink-600/20",
    border: "border-purple-500/30",
    glow: "hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]",
    icon: "text-purple-400",
    progressBar: "bg-gradient-to-r from-purple-500 to-pink-500",
  },
  super_recruiter: {
    gradient: "from-amber-500/20 to-orange-600/20",
    border: "border-amber-500/30",
    glow: "hover:shadow-[0_0_25px_rgba(245,158,11,0.3)]",
    icon: "text-amber-400",
    progressBar: "bg-gradient-to-r from-amber-500 to-orange-500",
  },
  lightning_reflexes: {
    gradient: "from-emerald-500/20 to-teal-600/20",
    border: "border-emerald-500/30",
    glow: "hover:shadow-[0_0_25px_rgba(16,185,129,0.3)]",
    icon: "text-emerald-400",
    progressBar: "bg-gradient-to-r from-emerald-500 to-teal-500",
  },

  // NEW: Easter Egg achievement colors
  binary_easter_egg: {
    gradient: "from-green-500/20 to-lime-600/20",
    border: "border-green-500/30",
    glow: "hover:shadow-[0_0_25px_rgba(34,197,94,0.3)]",
    icon: "text-green-400",
    progressBar: "bg-gradient-to-r from-green-500 to-lime-500",
  },
  cat_easter_egg: {
    gradient: "from-pink-500/20 to-rose-600/20",
    border: "border-pink-500/30",
    glow: "hover:shadow-[0_0_25px_rgba(236,72,153,0.3)]",
    icon: "text-pink-400",
    progressBar: "bg-gradient-to-r from-pink-500 to-rose-500",
  },
  winx_easter_egg: {
    gradient: "from-violet-500/20 to-fuchsia-600/20",
    border: "border-violet-500/30",
    glow: "hover:shadow-[0_0_25px_rgba(139,92,246,0.3)]",
    icon: "text-violet-400",
    progressBar: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
  },
};

export default function AchievementsModal({
  isOpen,
  onClose,
  achievements,
  user,
  rankings,
}: AchievementsModalProps) {
  const t = useT();
  const [hoveredAchievement, setHoveredAchievement] = useState<string | null>(
    null,
  );

  // Use achievement data from props
  const achievementsList = achievements?.achievements || [];
  const unlockedCount = achievements?.unlockedCount || 0;
  const totalCount = achievements?.totalCount || 7; // Updated total to include Easter Eggs
  const totalAttemptsEarned = achievements?.totalAttemptsEarned || 0;

  // Telegram WebApp back button management
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      
      if (isOpen) {
        // Show back button when modal opens
        webApp.BackButton.show();
        
        // Handle back button click
        const handleBackClick = () => {
          onClose();
        };
        
        webApp.BackButton.onClick(handleBackClick);
        
        // Cleanup function
        return () => {
          webApp.BackButton.offClick(handleBackClick);
          webApp.BackButton.hide();
        };
      } else {
        // Hide back button when modal closes
        webApp.BackButton.hide();
      }
    }
  }, [isOpen, onClose]);

  // Helper function to convert snake_case to camelCase for localization keys
  const toCamelCase = (str: string) => {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  };

  const formatDescriptionValue = (achievement: Achievement) => {
    const params: Record<string, any> = {};

    if (achievement.id === "super_recruiter") {
      params.count = 100;
    }
    if (achievement.id === "lightning_reflexes") {
      params.time = 10;
    }

    const camelCaseId = toCamelCase(achievement.id);

    return t(`profile.achievements.descriptions.${camelCaseId}` as any, params);
  };

  const getAchievementColors = (achievement: Achievement) => {
    return ACHIEVEMENT_COLORS[achievement.id] || ACHIEVEMENT_COLORS.first_game;
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/90 backdrop-blur-md",
        base: "bg-gradient-to-b from-gray-900 via-black to-gray-900 border-0 m-0 rounded-none h-full max-h-full",
        header: "border-b border-white/10 bg-black/50 px-6 py-4",
        body: "px-6 bg-transparent overflow-y-auto max-h-[calc(100vh-120px)]",
        closeButton: "hidden",
      }}
      closeButton={false}
      hideCloseButton={true}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
      isOpen={isOpen}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            y: 20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
      scrollBehavior="inside"
      size="full"
      onClose={onClose}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              {/* Header without icon, centered and lower */}
              <div className="flex items-center justify-center mt-4">
                <div className="text-center">
                  <span className="text-white font-bold tracking-wider text-xl bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    {t("profile.achievements.title")}
                  </span>
                  <p className="text-sm text-white/60 font-normal mt-2">
                    {t("profile.achievementsUnlocked", {
                      count: unlockedCount,
                      total: totalCount,
                    })}
                  </p>
                </div>
              </div>

              {/* Total Attempts Display with neon effect */}
              {totalAttemptsEarned > 0 && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-full">
                    <Gift className="text-green-400" size={16} />
                    <span className="text-sm text-green-400 font-mono">
                      +{totalAttemptsEarned} {t("profile.attempts")}
                    </span>
                  </div>
                </div>
              )}
            </ModalHeader>

            <ModalBody className="pb-6">
              {/* Info Banner with tech styling */}
              <div className="relative mb-6 mt-4">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg blur" />
                <div className="relative bg-black/50 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-start space-x-3">
                    <Sparkles className="text-cyan-400 mt-0.5" size={18} />
                    <div className="flex-1">
                      <p className="text-sm text-white/80 mb-2">
                        {t("profile.achievements.rewardsInfo")}
                      </p>
                      <p className="text-xs text-white/50 font-mono">
                        {t("profile.achievements.automaticRewards")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {achievementsList.length === 0 ? (
                <div className="text-center py-16">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-xl opacity-30" />
                    <Trophy
                      className="relative text-white/40 mx-auto mb-6"
                      size={64}
                    />
                  </div>
                  <p className="text-white/60 mb-3 text-lg">
                    {t("profile.achievements.noAchievements")}
                  </p>
                  <p className="text-sm text-white/40 font-mono">
                    {t("profile.achievements.playToUnlock")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {achievementsList.map((achievement) => {
                    const Icon = ACHIEVEMENT_ICONS[achievement.id] || Trophy;
                    const colors = getAchievementColors(achievement);

                    return (
                      <div
                        key={achievement.id}
                        className={`
                          relative p-3 rounded-lg border transition-all duration-300
                          ${
                            achievement.unlocked
                              ? `bg-gradient-to-r ${colors.gradient} ${colors.border} ${colors.glow}`
                              : "bg-black/40 border-white/5 opacity-60"
                          }
                          hover:scale-[1.02] cursor-pointer
                        `}
                        onMouseEnter={() =>
                          setHoveredAchievement(achievement.id)
                        }
                        onMouseLeave={() => setHoveredAchievement(null)}
                      >
                        {/* Animated border effect for unlocked achievements */}
                        {achievement.unlocked && (
                          <div className="absolute inset-0 rounded-lg overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
                          </div>
                        )}

                        <div className="relative flex items-start space-x-3">
                          {/* Icon with holographic effect */}
                          <div className="relative">
                            {achievement.unlocked && (
                              <div
                                className={`absolute inset-0 ${colors.icon} blur-xl opacity-50`}
                              />
                            )}
                            <div
                              className={`
                              relative w-10 h-10 rounded-lg flex items-center justify-center
                              ${
                                achievement.unlocked
                                  ? `bg-black/50 border ${colors.border}`
                                  : "bg-white/5 border border-white/10"
                              }
                            `}
                            >
                              <Icon
                                className={
                                  achievement.unlocked
                                    ? colors.icon
                                    : "text-white/30"
                                }
                                size={20}
                              />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3
                              className={`
                              font-bold text-sm mb-1
                              ${achievement.unlocked ? "text-white" : "text-white/40"}
                            `}
                            >
                              {t(
                                `profile.achievements.${toCamelCase(achievement.id)}` as any,
                              ) || achievement.name}
                            </h3>

                            <p
                              className={`
                              text-xs mb-2 font-mono
                              ${achievement.unlocked ? "text-white/70" : "text-white/30"}
                            `}
                            >
                              {formatDescriptionValue(achievement)}
                            </p>

                            {/* Reward Badge with neon effect */}
                            <div className="mb-2">
                              <div
                                className={`
                                inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono
                                ${
                                  achievement.unlocked
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "bg-white/5 text-white/30 border border-white/10"
                                }
                              `}
                              >
                                {achievement.unlocked ? (
                                  <Gift size={12} />
                                ) : (
                                  <Lock size={12} />
                                )}
                                <span>+{achievement.attempts_reward}</span>
                              </div>
                            </div>

                            {/* Progress bar with gradient - hide for Easter Eggs and binary achievements */}
                            {achievement.progress !== undefined &&
                              achievement.max_progress !== undefined &&
                              achievement.max_progress > 1 && ( // Only show progress for multi-step achievements
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs font-mono">
                                    <span className="text-white/50">
                                      {t("profile.progress")}
                                    </span>
                                    <span
                                      className={
                                        achievement.unlocked
                                          ? "text-white/80"
                                          : "text-white/40"
                                      }
                                    >
                                      {achievement.progress} /{" "}
                                      {achievement.max_progress}
                                    </span>
                                  </div>
                                  <div className="relative w-full bg-black/50 rounded-full h-1.5 overflow-hidden border border-white/10">
                                    <div
                                      className={`
                                      h-full transition-all duration-500
                                      ${achievement.unlocked ? colors.progressBar : "bg-white/20"}
                                    `}
                                      style={{
                                        width: `${Math.min(100, (achievement.progress / achievement.max_progress) * 100)}%`,
                                      }}
                                    />
                                    {achievement.unlocked && (
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>

                          {/* Unlock indicator with pulse effect */}
                          {achievement.unlocked && (
                            <div className="flex-shrink-0 relative">
                              <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-50 animate-pulse" />
                              <div className="relative w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center border border-green-400/50">
                                <svg
                                  className="w-3 h-3 text-black"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    clipRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    fillRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Unlocked Date with tech font */}
                        {achievement.unlocked && achievement.unlocked_at && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <p className="text-xs text-white/40 font-mono">
                              {t("profile.achievements.unlockedOn", {
                                date: new Date(
                                  achievement.unlocked_at,
                                ).toLocaleDateString(),
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom spacing for safe scrolling */}
              <div className="h-8" />
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}