// src/components/Profile/EnhancedProfileHeader.tsx - Updated with removed borders and monochrome theme

"use client";

import type {
  UserProfileGameStats,
  Achievement,
} from "@/hooks/modules/useProfile";

import React, { useState } from "react";
import {
  Trophy,
  Gamepad2,
  Users,
  Zap,
  Sparkles,
  Hash,
  Cat,
  Wand2,
} from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";

interface EnhancedProfileHeaderProps {
  user: UserProfileGameStats;
  achievements?: Achievement[];
}

// Map achievement IDs to their icon components
const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<any>> = {
  first_game: Trophy,
  all_modes_player: Gamepad2,
  super_recruiter: Users,
  lightning_reflexes: Zap,
  binary_easter_egg: Hash,
  cat_easter_egg: Cat,
  winx_easter_egg: Wand2,
};

const EnhancedProfileHeader: React.FC<EnhancedProfileHeaderProps> = ({
  user,
  achievements = [],
}) => {
  const t = useT();
  const [hoveredAchievement, setHoveredAchievement] = useState<string | null>(
    null,
  );

  // Filter for unlocked achievements
  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  return (
    <div className="relative text-center space-y-4 px-4 py-6 pt-16">
      {/* User Name */}
      <div className="relative">
        <h1 className="text-2xl font-bold text-white tracking-wider">
          {user.first_name} {user.last_name || ""}
        </h1>

        {/* Username */}
        {user.username && (
          <p className="text-white/60 text-sm font-mono mt-1">
            <span className="text-white/30">@</span>
            <span className="text-white/70">{user.username}</span>
          </p>
        )}
      </div>

      {/* Level Display with shadow instead of border */}
      <div className="relative inline-block">
        <div className="bg-black/60 rounded-lg px-4 py-1.5 backdrop-blur-sm shadow-lg">
          <div className="text-white/80 text-sm font-mono tracking-wider">
            <span className="text-white/50">{t("profile.levelDisplay")}</span>
            <span className="ml-2 text-white font-bold">
              {user.current_level}
            </span>
          </div>
        </div>
      </div>

      {/* Achievement Icons Display */}
      {unlockedAchievements.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Achievement grid */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {unlockedAchievements.map((achievement) => {
              const IconComponent = ACHIEVEMENT_ICONS[achievement.id] || Trophy;
              const isHovered = hoveredAchievement === achievement.id;

              return (
                <div
                  key={achievement.id}
                  className="group relative"
                  onMouseEnter={() => setHoveredAchievement(achievement.id)}
                  onMouseLeave={() => setHoveredAchievement(null)}
                >
                  {/* Achievement Icon Container */}
                  <div
                    className={`
                      relative w-12 h-12 rounded-lg flex items-center justify-center
                      bg-white/10 backdrop-blur-sm transition-all duration-300
                      group-hover:scale-110 cursor-pointer
                      ${isHovered ? "shadow-lg" : "shadow-md"}
                    `}
                  >
                    <IconComponent
                      className={`text-white/80 transition-all duration-300 ${isHovered ? "scale-110" : ""}`}
                      size={24}
                    />
                  </div>

                  {/* Tooltip on hover */}
                  <div
                    className={`
                    absolute bottom-full left-1/2 transform -translate-x-1/2 mb-8
                    transition-all duration-200 pointer-events-none z-20
                    ${isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
                  `}
                  >
                    <div className="relative">
                      <div className="bg-black/90 rounded-lg px-3 py-2 backdrop-blur-sm shadow-lg">
                        <div className="font-semibold text-white text-xs whitespace-nowrap">
                          {achievement.name}
                        </div>
                        <div className="text-white/60 text-[10px] mt-0.5 font-mono">
                          {achievement.description}
                        </div>
                      </div>

                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-black/90" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Achievement Summary with shadow instead of border */}
          <div className="relative inline-block mt-6">
            <div className="bg-black/50 rounded-full px-3 py-1 backdrop-blur-sm shadow-md">
              <div className="flex items-center gap-2">
                <Sparkles className="text-white/60" size={12} />
                <p className="text-white/70 text-xs font-mono">
                  {t("profile.achievementsUnlocked", {
                    count: unlockedAchievements.length,
                    total: achievements.length,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedProfileHeader;