// src/components/Profile/AchievementsModal.tsx - Updated with server architecture types

"use client";

import type {
  SafeProfileData,
  UserRankings,
} from "@/lib/server/profileService";

import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@nextui-org/react";
import {
  Trophy,
  Award,
  Zap,
  Crosshair,
  Atom,
  RotateCw,
  Users,
  Star,
  Target,
  Clock,
  Activity,
  Crown,
} from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SafeProfileData;
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
      // General achievements
      {
        id: "active_player",
        titleKey: "profile.achievements.activePlayer",
        descriptionKey: "profile.achievements.descriptions.gamesPlayed",
        icon: Activity,
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        isUnlocked: user.total_games >= 1,
        progress: user.total_games,
        maxProgress: 1,
      },
      {
        id: "dedicated_gamer",
        titleKey: "profile.achievements.dedicatedGamer",
        descriptionKey: "profile.achievements.descriptions.gamesPlayed",
        icon: Trophy,
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        isUnlocked: user.total_games >= 10,
        progress: user.total_games,
        maxProgress: 10,
      },
      {
        id: "game_master",
        titleKey: "profile.achievements.gameMaster",
        descriptionKey: "profile.achievements.descriptions.gamesPlayed",
        icon: Award,
        color: "text-purple-400",
        bgColor: "bg-purple-500/20",
        isUnlocked: user.total_games >= 50,
        progress: user.total_games,
        maxProgress: 50,
      },

      // Referral achievements
      {
        id: "recruiter",
        titleKey: "profile.achievements.recruiter",
        descriptionKey: "profile.achievements.descriptions.invitedFriend",
        icon: Users,
        color: "text-green-400",
        bgColor: "bg-green-500/20",
        isUnlocked: user.referral_count >= 1,
        progress: user.referral_count,
        maxProgress: 1,
      },
      {
        id: "influencer",
        titleKey: "profile.achievements.influencer",
        descriptionKey: "profile.achievements.descriptions.invitedFriends",
        icon: Star,
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/20",
        isUnlocked: user.referral_count >= 5,
        progress: user.referral_count,
        maxProgress: 5,
      },
      {
        id: "ambassador",
        titleKey: "profile.achievements.ambassador",
        descriptionKey: "profile.achievements.descriptions.invitedFriends",
        icon: Award,
        color: "text-orange-400",
        bgColor: "bg-orange-500/20",
        isUnlocked: user.referral_count >= 20,
        progress: user.referral_count,
        maxProgress: 20,
      },

      // Reaction mode achievements
      {
        id: "speed_tester",
        titleKey: "profile.achievements.speedTester",
        descriptionKey: "profile.achievements.descriptions.testedReaction",
        icon: Zap,
        color: "text-white",
        bgColor: "bg-white/20",
        isUnlocked: user.reaction_games >= 1,
      },
      {
        id: "quick_reflexes",
        titleKey: "profile.achievements.quickReflexes",
        descriptionKey: "profile.achievements.descriptions.reactionTests",
        icon: Zap,
        color: "text-white",
        bgColor: "bg-white/20",
        isUnlocked: user.reaction_games >= 10,
        progress: user.reaction_games,
        maxProgress: 10,
      },
      {
        id: "lightning_fast",
        titleKey: "profile.achievements.lightningFast",
        descriptionKey: "profile.achievements.descriptions.subReaction",
        icon: Zap,
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/20",
        isUnlocked:
          user.reaction_best_time > 0 && user.reaction_best_time <= 200,
      },
      {
        id: "superhuman_speed",
        titleKey: "profile.achievements.superhumanSpeed",
        descriptionKey: "profile.achievements.descriptions.subReaction",
        icon: Zap,
        color: "text-red-400",
        bgColor: "bg-red-500/20",
        isUnlocked:
          user.reaction_best_time > 0 && user.reaction_best_time <= 150,
      },
      {
        id: "speed_demon",
        titleKey: "profile.achievements.speedDemon",
        descriptionKey: "profile.achievements.descriptions.topReaction",
        icon: Zap,
        color: "text-purple-400",
        bgColor: "bg-purple-500/20",
        isUnlocked: rankings.reaction !== null && rankings.reaction <= 10,
      },

      // Survival mode achievements
      {
        id: "survivor",
        titleKey: "profile.achievements.survivor",
        descriptionKey: "profile.achievements.descriptions.enteredSurvival",
        icon: Crosshair,
        color: "text-red-400",
        bgColor: "bg-red-500/20",
        isUnlocked: user.survival_games >= 1,
      },
      {
        id: "persistent_survivor",
        titleKey: "profile.achievements.persistentSurvivor",
        descriptionKey: "profile.achievements.descriptions.survivalAttempts",
        icon: Crosshair,
        color: "text-red-400",
        bgColor: "bg-red-500/20",
        isUnlocked: user.survival_games >= 10,
        progress: user.survival_games,
        maxProgress: 10,
      },
      {
        id: "endurance_master",
        titleKey: "profile.achievements.enduranceMaster",
        descriptionKey: "profile.achievements.descriptions.secondsSurvival",
        icon: Clock,
        color: "text-orange-400",
        bgColor: "bg-orange-500/20",
        isUnlocked: user.survival_best_time >= 30000,
      },
      {
        id: "survival_legend",
        titleKey: "profile.achievements.survivalLegend",
        descriptionKey: "profile.achievements.descriptions.minuteSurvival",
        icon: Trophy,
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/20",
        isUnlocked: user.survival_best_time >= 60000,
      },
      {
        id: "level_climber",
        titleKey: "profile.achievements.levelClimber",
        descriptionKey: "profile.achievements.descriptions.reachedLevel",
        icon: Target,
        color: "text-green-400",
        bgColor: "bg-green-500/20",
        isUnlocked: user.survival_max_level >= 5,
        progress: user.survival_max_level,
        maxProgress: 5,
      },
      {
        id: "elite_survivor",
        titleKey: "profile.achievements.eliteSurvivor",
        descriptionKey: "profile.achievements.descriptions.reachedLevel",
        icon: Award,
        color: "text-red-400",
        bgColor: "bg-red-500/20",
        isUnlocked: user.survival_max_level >= 10,
        progress: user.survival_max_level,
        maxProgress: 10,
      },
      {
        id: "streak_master",
        titleKey: "profile.achievements.streakMaster",
        descriptionKey: "profile.achievements.descriptions.perfectHits",
        icon: Target,
        color: "text-purple-400",
        bgColor: "bg-purple-500/20",
        isUnlocked: user.survival_best_streak >= 50,
        progress: user.survival_best_streak,
        maxProgress: 50,
      },
      {
        id: "survival_elite",
        titleKey: "profile.achievements.survivalElite",
        descriptionKey: "profile.achievements.descriptions.topSurvivor",
        icon: Crown,
        color: "text-red-400",
        bgColor: "bg-red-500/20",
        isUnlocked: rankings.survival !== null && rankings.survival <= 10,
      },

      // Physics mode achievements
      {
        id: "physics_experimenter",
        titleKey: "profile.achievements.physicsExperimenter",
        descriptionKey: "profile.achievements.descriptions.enteredPhysics",
        icon: Atom,
        color: "text-purple-400",
        bgColor: "bg-purple-500/20",
        isUnlocked: user.physics_games >= 1,
      },
      {
        id: "impulse_master",
        titleKey: "profile.achievements.impulseMaster",
        descriptionKey: "profile.achievements.descriptions.physicsAttempts",
        icon: Atom,
        color: "text-purple-400",
        bgColor: "bg-purple-500/20",
        isUnlocked: user.physics_games >= 10,
        progress: user.physics_games,
        maxProgress: 10,
      },
      {
        id: "wall_breaker",
        titleKey: "profile.achievements.wallBreaker",
        descriptionKey: "profile.achievements.descriptions.physicsScore",
        icon: Target,
        color: "text-indigo-400",
        bgColor: "bg-indigo-500/20",
        isUnlocked: user.physics_best_score >= 100,
        progress: user.physics_best_score,
        maxProgress: 100,
      },

      // Rotation mode achievements
      {
        id: "rotation_tester",
        titleKey: "profile.achievements.rotationTester",
        descriptionKey: "profile.achievements.descriptions.enteredRotation",
        icon: RotateCw,
        color: "text-orange-400",
        bgColor: "bg-orange-500/20",
        isUnlocked: user.rotation_games >= 1,
      },
      {
        id: "spin_master",
        titleKey: "profile.achievements.spinMaster",
        descriptionKey: "profile.achievements.descriptions.rotationAttempts",
        icon: RotateCw,
        color: "text-orange-400",
        bgColor: "bg-orange-500/20",
        isUnlocked: user.rotation_games >= 10,
        progress: user.rotation_games,
        maxProgress: 10,
      },
      {
        id: "dizziness_resistant",
        titleKey: "profile.achievements.dizzinessResistant",
        descriptionKey: "profile.achievements.descriptions.rotationTime",
        icon: Clock,
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/20",
        isUnlocked: user.rotation_best_time >= 60000,
        progress: Math.floor(user.rotation_best_time / 1000),
        maxProgress: 60,
      },

      // Top player achievements (using rankings from server)
      {
        id: "top_player",
        titleKey: "profile.achievements.topPlayer",
        descriptionKey: "profile.achievements.descriptions.topOverall",
        icon: Trophy,
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/20",
        isUnlocked: rankings.overall !== null && rankings.overall <= 10,
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
      params.time = achievement.maxProgress || 200;
    }
    if (descriptionKey.includes("{level}")) {
      params.level = achievement.maxProgress || 5;
    }
    if (descriptionKey.includes("{score}")) {
      params.score = achievement.maxProgress || 100;
    }
    if (descriptionKey.includes("{rank}")) {
      params.rank = 10;
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
                          ${
                            achievement.isUnlocked
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
                                ${
                                  achievement.isUnlocked
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
                                ${
                                  achievement.isUnlocked
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
