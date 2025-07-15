// src/components/Profile/AchievementsModal.tsx - Enhanced achievements modal with new system

"use client";

import type { User } from "@/lib/supabase";
import type { Achievement, AchievementCategory } from "@/types/achievements";

import React, { useState, useMemo } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
} from "@nextui-org/react";
import { Trophy, CheckCircle, X, Star } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";
import { AchievementService } from "@/lib/achievementService";

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  rankings: {
    overall: number | null;
    reaction: number | null;
    survival: number | null;
    physics?: number | null;
    rotation?: number | null;
  };
}

const AchievementCard: React.FC<{
  achievement: Achievement;
  t: any;
}> = ({ achievement, t }) => {
  const colors = AchievementService.getRarityColor(achievement.rarity);
  const hasProgress =
    achievement.progress !== undefined && achievement.maxProgress !== undefined;
  const progressPercentage = hasProgress
    ? Math.min(100, (achievement.progress! / achievement.maxProgress!) * 100)
    : 0;

  return (
    <div
      className={`
      relative p-4 rounded-lg border transition-all duration-200
      ${
        achievement.isUnlocked
          ? `${colors.bg} ${colors.border}`
          : "bg-white/5 border-white/10"
      }
    `}
    >
      <div className="flex items-start space-x-3">
        {/* Achievement Icon */}
        <div
          className={`
          w-12 h-12 rounded-lg flex items-center justify-center text-xl
          ${achievement.isUnlocked ? colors.bg : "bg-white/10"}
        `}
        >
          {achievement.isUnlocked ? achievement.icon : "🔒"}
        </div>

        {/* Achievement Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3
                className={`
                font-bold text-sm mb-1
                ${achievement.isUnlocked ? "text-white" : "text-white/50"}
              `}
              >
                {t(achievement.titleKey as any)}
              </h3>
              <p
                className={`
                text-xs
                ${achievement.isUnlocked ? "text-white/80" : "text-white/40"}
              `}
              >
                {t(achievement.descriptionKey as any)}
              </p>
            </div>

            {/* Rarity Badge */}
            <div
              className={`
              px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
              ${colors.bg} ${colors.text}
            `}
            >
              {t(`achievements.rarity.${achievement.rarity}` as any)}
            </div>
          </div>

          {/* Progress Section */}
          {hasProgress && !achievement.isUnlocked && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-white/60">
                  {t("achievements.stats.progress")}
                </span>
                <span className="text-white/80 font-mono">
                  {achievement.progress} / {achievement.maxProgress}
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-white/60 transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Completion Indicator */}
          {achievement.isUnlocked && (
            <div className="flex items-center space-x-1 mt-2">
              <CheckCircle className="text-green-400" size={14} />
              <span className="text-green-400 text-xs font-bold">
                {t("achievements.stats.unlocked")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CategorySection: React.FC<{
  category: AchievementCategory;
  t: any;
}> = ({ category, t }) => {
  const unlockedCount = category.achievements.filter(
    (a) => a.isUnlocked,
  ).length;
  const totalCount = category.achievements.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">
          {t(category.titleKey as any)}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-white/60 text-sm">
            {unlockedCount}/{totalCount}
          </span>
          <div className="w-16 bg-white/20 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-white/60 transition-all duration-500"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {category.achievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            t={t}
          />
        ))}
      </div>
    </div>
  );
};

export default function AchievementsModal({
  isOpen,
  onClose,
  user,
  rankings,
}: AchievementsModalProps) {
  const t = useT();
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "unlocked" | "locked"
  >("all");

  const achievementData = useMemo(() => {
    const categories = AchievementService.calculateAchievements(user, rankings);
    const stats = AchievementService.getAchievementStats(categories);

    return { categories, stats };
  }, [user, rankings]);

  const filteredCategories = useMemo(() => {
    if (selectedFilter === "all") return achievementData.categories;

    return achievementData.categories
      .map((category) => ({
        ...category,
        achievements: category.achievements.filter((achievement) =>
          selectedFilter === "unlocked"
            ? achievement.isUnlocked
            : !achievement.isUnlocked,
        ),
      }))
      .filter((category) => category.achievements.length > 0);
  }, [achievementData.categories, selectedFilter]);

  return (
    <Modal
      isOpen={isOpen}
      scrollBehavior="inside"
      size="3xl"
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/80",
        base: "bg-black border border-white/20 max-h-[90vh]",
        header: "border-b border-white/10",
        body: "py-0",
      }}
      hideCloseButton={true}
      onClose={onClose}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Trophy className="text-yellow-400" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {t("achievements.title")}
              </h1>
              <p className="text-white/60 text-sm font-normal">
                {t("achievements.subtitle")}
              </p>
            </div>
          </div>

          <button
            className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all duration-300"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </ModalHeader>

        <ModalBody className="px-6 pb-6">
          {/* Statistics Header */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {achievementData.stats.unlocked}
              </div>
              <div className="text-white/60 text-sm">
                {t("achievements.stats.unlocked")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {achievementData.stats.total}
              </div>
              <div className="text-white/60 text-sm">
                {t("achievements.stats.total")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {achievementData.stats.percentage}%
              </div>
              <div className="text-white/60 text-sm">
                {t("achievements.stats.progress")}
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex space-x-2 mb-6">
            {[
              { key: "all", label: t("achievements.stats.locked") },
              { key: "unlocked", label: t("achievements.stats.unlocked") },
              { key: "locked", label: t("achievements.stats.all") },
            ].map((filter) => (
              <Button
                key={filter.key}
                size="sm"
                className={`
                  ${
                    selectedFilter === filter.key
                      ? "bg-white/20 text-white border-white/30"
                      : "bg-transparent text-white/60 border-white/10 hover:bg-white/10"
                  }
                `}
                variant="bordered"
                onPress={() => setSelectedFilter(filter.key as any)}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Achievement Categories */}
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <Star className="text-white/40 mx-auto mb-4" size={48} />
              <h3 className="text-white/60 text-lg mb-2">
                {t("achievements.empty.title")}
              </h3>
              <p className="text-white/40 text-sm">
                {t("achievements.empty.description")}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredCategories.map((category) => (
                <CategorySection
                  key={category.type}
                  category={category}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* Bottom spacing for scroll */}
          <div className="h-4" />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
