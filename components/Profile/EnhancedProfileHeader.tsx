// src/components/Profile/EnhancedProfileHeader.tsx - Updated with achievement icons display

"use client";

import type { UserProfileGameStats, Achievement } from "@/hooks/modules/useProfile";

import React from "react";
import { Trophy, Gamepad2, Users, Zap } from "lucide-react";

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
};

const EnhancedProfileHeader: React.FC<EnhancedProfileHeaderProps> = ({
  user,
  achievements = [],
}) => {
  const t = useT();

  // Filter for unlocked achievements
  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  return (
    <div className="text-center space-y-3 px-4 py-6">
      {/* User Name */}
      <h1 className="text-2xl font-bold text-white">
        {user.first_name} {user.last_name || ""}
      </h1>

      {/* Username */}
      {user.username && (
        <p className="text-white/60 text-sm">@{user.username}</p>
      )}

      {/* Level Display */}
      <div className="text-white/80 text-sm font-mono">
        {t("profile.levelDisplay", { level: user.current_level })}
      </div>

      {/* Achievement Icons Display - NEW */}
      {unlockedAchievements.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {unlockedAchievements.map((achievement) => {
              const IconComponent = ACHIEVEMENT_ICONS[achievement.id] || Trophy;

              return (
                <div
                  key={achievement.id}
                  className="group relative"
                  title={achievement.name}
                >
                  {/* Achievement Icon Container */}
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${achievement.bg_color}
                      border border-white/20
                      transition-all duration-200
                      hover:scale-110 hover:border-white/40
                      cursor-pointer
                    `}
                  >
                    <IconComponent
                      className={achievement.color}
                      size={20}
                    />
                  </div>

                  {/* Tooltip on hover */}
                  <div className="
                    absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                    opacity-0 group-hover:opacity-100
                    transition-opacity duration-200
                    pointer-events-none
                    z-10
                  ">
                    <div className="
                      bg-black/90 text-white text-xs rounded-lg px-3 py-2
                      whitespace-nowrap border border-white/20
                    ">
                      <div className="font-semibold">{achievement.name}</div>
                      <div className="text-white/60 text-[10px] mt-0.5">
                        +{achievement.attempts_reward} {t("profile.attempts")}
                      </div>
                    </div>
                    {/* Tooltip arrow */}
                    <div className="
                      absolute top-full left-1/2 transform -translate-x-1/2
                      w-0 h-0 -mt-px
                      border-l-4 border-l-transparent
                      border-r-4 border-r-transparent
                      border-t-4 border-t-black/90
                    " />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Achievement Summary Text */}
          <p className="text-white/50 text-xs mt-2">
            {t("profile.achievementsUnlocked", {
              count: unlockedAchievements.length,
              total: achievements.length
            })}
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedProfileHeader;