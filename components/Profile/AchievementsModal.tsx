// src/components/Profile/AchievementsModal.tsx - Simplified achievements modal with 4 core achievements

"use client";

import type {
  UserProfileGameStats,
  UserRankings,
} from "@/hooks/modules/useProfile";

import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";
import {
  Trophy,
  Users,
  Gamepad2,
  Zap,
} from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileGameStats;
  rankings: UserRankings;
}

interface Achievement {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  isUnlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

export default function AchievementsModal({
  isOpen,
  onClose,
  user,
  rankings,
}: AchievementsModalProps) {
  const t = useT();

  const getAchievements = (): Achievement[] => {
    const achievements: Achievement[] = [
      // First game achievement
      {
        id: "first_game",
        titleKey: "profile.achievements.firstGame",
        descriptionKey: "profile.achievements.descriptions.firstGame",
        icon: Trophy,
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        isUnlocked: user.total_games >= 1,
        progress: user.total_games >= 1 ? 1 : 0,
        maxProgress: 1,
      },

      // All modes played achievement
      {
        id: "all_modes_player",
        titleKey: "profile.achievements.allModesPlayer",
        descriptionKey: "profile.achievements.descriptions.allModesPlayer",
        icon: Gamepad2,
        color: "text-purple-400",
        bgColor: "bg-purple-500/20",
        isUnlocked: user.reaction_games >= 1 &&
          user.survival_games >= 1 &&
          user.physics_games >= 1 &&
          user.rotation_games >= 1,
        progress: [
          user.reaction_games >= 1 ? 1 : 0,
          user.survival_games >= 1 ? 1 : 0,
          user.physics_games >= 1 ? 1 : 0,
          user.rotation_games >= 1 ? 1 : 0,
        ].reduce((sum, val) => sum + val, 0),
        maxProgress: 4,
      },

      // Super recruiter achievement (100+ friends)
      {
        id: "super_recruiter",
        titleKey: "profile.achievements.superRecruiter",
        descriptionKey: "profile.achievements.descriptions.superRecruiter",
        icon: Users,
        color: "text-gold-400",
        bgColor: "bg-yellow-500/20",
        isUnlocked: user.referral_count >= 100,
        progress: user.referral_count,
        maxProgress: 100,
      },

      // Lightning reflexes achievement (<10ms reaction)
      {
        id: "lightning_reflexes",
        titleKey: "profile.achievements.lightningReflexes",
        descriptionKey: "profile.achievements.descriptions.lightningReflexes",
        icon: Zap,
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/20",
        isUnlocked: user.reaction_best_time > 0 && user.reaction_best_time < 10,
      },
    ];

    return achievements;
  };

  const achievements = getAchievements();
  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  const formatDescriptionValue = (
    descriptionKey: string,
    achievement: Achievement,
  ) => {
    const params: Record<string, any> = {};

    if (descriptionKey.includes("{count}")) {
      params.count = achievement.maxProgress || achievement.progress || 1;
    }
    if (descriptionKey.includes("{time}")) {
      params.time = 10; // For the 10ms achievement
    }

    return t(descriptionKey as any, params);
  };

  return (
    <Modal isOpen={isOpen} scrollBehavior="inside" size="2xl" onClose={onClose}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 bg-black text-white">
              <div className="flex items-center space-x-2">
                <Trophy className="text-yellow-400" size={20} />
                <span>{t("profile.achievements.title")}</span>
              </div>
              <p className="text-sm text-white/60 font-normal">
                {unlockedCount} / {achievements.length} разблокировано
              </p>
            </ModalHeader>
            <ModalBody className="bg-black text-white">
              {achievements.length === 0 ? (
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
                  {achievements.map((achievement) => {
                    const Icon = achievement.icon;

                    return (
                      <div
                        key={achievement.id}
                        className={`
                          relative p-4 rounded-lg border transition-all duration-200
                          ${achievement.isUnlocked
                            ? `${achievement.bgColor} border-current/30`
                            : "bg-white/5 border-white/10"
                          }
                        `}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`
                              w-10 h-10 rounded-lg flex items-center justify-center
                              ${achievement.isUnlocked ? achievement.bgColor : "bg-white/10"}
                            `}
                          >
                            <Icon
                              className={
                                achievement.isUnlocked
                                  ? achievement.color
                                  : "text-white/40"
                              }
                              size={20}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3
                              className={`
                                font-bold text-sm mb-1
                                ${achievement.isUnlocked
                                  ? "text-white"
                                  : "text-white/60"
                                }
                              `}
                            >
                              {t(achievement.titleKey as any)}
                            </h3>

                            <p
                              className={`
                                text-xs mb-2
                                ${achievement.isUnlocked
                                  ? "text-white/80"
                                  : "text-white/40"
                                }
                              `}
                            >
                              {formatDescriptionValue(
                                achievement.descriptionKey,
                                achievement,
                              )}
                            </p>

                            {achievement.progress !== undefined &&
                              achievement.maxProgress !== undefined && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-white/60">
                                      Прогресс
                                    </span>
                                    <span className="text-white/80">
                                      {achievement.progress} /{" "}
                                      {achievement.maxProgress}
                                    </span>
                                  </div>
                                  <div className="w-full bg-white/10 rounded-full h-1.5">
                                    <div
                                      className={`
                                        h-1.5 rounded-full transition-all duration-500
                                        ${achievement.isUnlocked ? achievement.color.replace("text-", "bg-") : "bg-white/20"}
                                      `}
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          (achievement.progress /
                                            achievement.maxProgress) *
                                          100,
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                          </div>

                          {achievement.isUnlocked && (
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