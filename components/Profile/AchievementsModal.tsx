// src/components/Profile/AchievementsModal.tsx - Updated with attempt rewards display

"use client";

import type {
  UserProfileGameStats,
  UserRankings,
  Achievement,
  UserAchievementsData,
} from "@/hooks/modules/useProfile";

import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";
import { Trophy, Users, Gamepad2, Zap, X, Gift, Lock } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements?: UserAchievementsData;
  user?: UserProfileGameStats | null;
  rankings?: UserRankings;
}

// Map achievement IDs to their icon components
const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<any>> = {
  first_game: Trophy,
  all_modes_player: Gamepad2,
  super_recruiter: Users,
  lightning_reflexes: Zap,
};

export default function AchievementsModal({
  isOpen,
  onClose,
  achievements,
  user,
  rankings,
}: AchievementsModalProps) {
  const t = useT();

  // Use achievement data from props or calculate from user data for backward compatibility
  const achievementsList = achievements?.achievements || [];
  const unlockedCount = achievements?.unlockedCount || 0;
  const totalCount = achievements?.totalCount || 4;
  const totalAttemptsEarned = achievements?.totalAttemptsEarned || 0;

  // Helper function to convert snake_case to camelCase for localization keys
  const toCamelCase = (str: string) => {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  };

  const formatDescriptionValue = (
    achievement: Achievement,
  ) => {
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

  const getProgressBarColor = (achievement: Achievement) => {
    if (!achievement.unlocked) return "bg-white/20";

    switch (achievement.color) {
      case "text-blue-400":
        return "bg-blue-400";
      case "text-purple-400":
        return "bg-purple-400";
      case "text-yellow-400":
        return "bg-yellow-400";
      default:
        return "bg-white/60";
    }
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/80",
        base: "bg-black border border-white/20 m-4",
        header: "border-b border-white/10",
        body: "px-0",
        closeButton: "hidden",
      }}
      closeButton={false}
      hideCloseButton={true}
      isDismissable={true}
      isKeyboardDismissDisabled={false}
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
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
      scrollBehavior="inside"
      size="2xl"
      onClose={onClose}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 bg-black text-white relative px-6 py-4">
              <button
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300 z-10"
                onClick={onClose}
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-2">
                <Trophy className="text-yellow-400" size={20} />
                <span>{t("profile.achievements.title")}</span>
              </div>
              <p className="text-sm text-white/60 font-normal">
                {t("profile.achievementsUnlocked", {
                  count: unlockedCount,
                  total: totalCount
                })}
              </p>

              {/* Total Attempts Earned Display - NEW */}
              {totalAttemptsEarned > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Gift className="text-green-400" size={16} />
                  <span className="text-sm text-green-400">
                    {t("profile.achievements.totalAttemptsEarned", {
                      count: totalAttemptsEarned
                    })}
                  </span>
                </div>
              )}
            </ModalHeader>

            <ModalBody className="bg-black text-white px-6 pb-6">
              {/* Info Banner about Rewards - NEW */}
              <div className="bg-white/5 border border-white/20 rounded-lg p-3 mb-4">
                <div className="flex items-start space-x-2">
                  <Gift className="text-white/60 mt-0.5" size={16} />
                  <div className="flex-1">
                    <p className="text-sm text-white/80">
                      {t("profile.achievements.rewardsInfo")}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      {t("profile.achievements.automaticRewards")}
                    </p>
                  </div>
                </div>
              </div>

              {achievementsList.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="text-white/40 mx-auto mb-4" size={48} />
                  <p className="text-white/60 mb-2">
                    {t("profile.achievements.noAchievements")}
                  </p>
                  <p className="text-sm text-white/40">
                    {t("profile.achievements.playToUnlock")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {achievementsList.map((achievement) => {
                    const Icon = ACHIEVEMENT_ICONS[achievement.id] || Trophy;

                    return (
                      <div
                        key={achievement.id}
                        className={`
                          relative p-4 rounded-lg border transition-all duration-200
                          ${achievement.unlocked
                            ? `${achievement.bg_color} border-current/30`
                            : "bg-white/5 border-white/10"
                          }
                        `}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`
                              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                              ${achievement.unlocked ? achievement.bg_color : "bg-white/10"}
                            `}
                          >
                            <Icon
                              className={
                                achievement.unlocked
                                  ? achievement.color
                                  : "text-white/40"
                              }
                              size={20}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`
                                  font-bold text-sm
                                  ${achievement.unlocked
                                    ? "text-white"
                                    : "text-white/60"
                                  }
                                `}
                              >
                                {t(`profile.achievements.${toCamelCase(achievement.id)}` as any) || achievement.name}
                              </h3>

                              {/* Reward Badge - NEW */}
                              <div className={`
                                flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                                ${achievement.unlocked
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-white/10 text-white/40"}
                              `}>
                                {achievement.unlocked ? <Gift size={12} /> : <Lock size={12} />}
                                <span>+{achievement.attempts_reward}</span>
                              </div>
                            </div>

                            <p
                              className={`
                                text-xs mb-2
                                ${achievement.unlocked
                                  ? "text-white/80"
                                  : "text-white/40"
                                }
                              `}
                            >
                              {formatDescriptionValue(achievement)}
                            </p>

                            {achievement.progress !== undefined &&
                              achievement.max_progress !== undefined && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-white/60">
                                      {t("profile.progress")}
                                    </span>
                                    <span className="text-white/80">
                                      {achievement.progress} /{" "}
                                      {achievement.max_progress}
                                    </span>
                                  </div>
                                  <div className="w-full bg-white/10 rounded-full h-1.5">
                                    <div
                                      className={`
                                        h-1.5 rounded-full transition-all duration-500
                                        ${getProgressBarColor(achievement)}
                                      `}
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          (achievement.progress /
                                            achievement.max_progress) *
                                          100,
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                          </div>

                          {achievement.unlocked && (
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <svg
                                  className="w-3 h-3 text-white"
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

                        {/* Unlocked Date - NEW */}
                        {achievement.unlocked && achievement.unlocked_at && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <p className="text-xs text-white/50">
                              {t("profile.achievements.unlockedOn", {
                                date: new Date(achievement.unlocked_at).toLocaleDateString()
                              })}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}