// src/components/Profile/EnhancedProfileHeader.tsx - Future Tech styled profile header

"use client";

import type { UserProfileGameStats, Achievement } from "@/hooks/modules/useProfile";

import React, { useState } from "react";
import { Trophy, Gamepad2, Users, Zap, Gift, Sparkles } from "lucide-react";

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

// Future tech color schemes matching the modal
const ACHIEVEMENT_COLORS: Record<string, { 
  gradient: string; 
  border: string; 
  glow: string;
  icon: string;
  bgGradient: string;
}> = {
  first_game: {
    gradient: "from-cyan-500/20 to-blue-600/20",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.4)]",
    icon: "text-cyan-400",
    bgGradient: "from-cyan-500 to-blue-600"
  },
  all_modes_player: {
    gradient: "from-purple-500/20 to-pink-600/20",
    border: "border-purple-500/30",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.4)]",
    icon: "text-purple-400",
    bgGradient: "from-purple-500 to-pink-600"
  },
  super_recruiter: {
    gradient: "from-amber-500/20 to-orange-600/20",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.4)]",
    icon: "text-amber-400",
    bgGradient: "from-amber-500 to-orange-600"
  },
  lightning_reflexes: {
    gradient: "from-emerald-500/20 to-teal-600/20",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    icon: "text-emerald-400",
    bgGradient: "from-emerald-500 to-teal-600"
  },
};

const EnhancedProfileHeader: React.FC<EnhancedProfileHeaderProps> = ({
  user,
  achievements = [],
}) => {
  const t = useT();
  const [hoveredAchievement, setHoveredAchievement] = useState<string | null>(null);

  // Filter for unlocked achievements
  const unlockedAchievements = achievements.filter((a) => a.unlocked);

  return (
    <div className="relative text-center space-y-4 px-4 py-6">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/5 via-transparent to-cyan-900/5 pointer-events-none" />
      
      {/* User Name with glowing effect */}
      <div className="relative">
        <h1 className="text-2xl font-bold text-white tracking-wider">
          <span className="relative">
            {user.first_name} {user.last_name || ""}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 blur-xl" />
          </span>
        </h1>

        {/* Username with tech styling */}
        {user.username && (
          <p className="text-white/60 text-sm font-mono mt-1">
            <span className="text-white/30">@</span>
            <span className="bg-gradient-to-r from-cyan-400/70 to-purple-400/70 bg-clip-text text-transparent">
              {user.username}
            </span>
          </p>
        )}
      </div>

      {/* Level Display with neon border */}
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg blur opacity-30" />
        <div className="relative bg-black/60 border border-white/20 rounded-lg px-4 py-1.5 backdrop-blur-sm">
          <div className="text-white/80 text-sm font-mono tracking-wider">
            <span className="text-white/50">{t("profile.levelDisplay")}</span>
            <span className="ml-2 text-white font-bold">{user.current_level}</span>
            
          </div>
        </div>
      </div>

      {/* Achievement Icons Display with Future Tech styling */}
      {unlockedAchievements.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Achievement grid */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {unlockedAchievements.map((achievement) => {
              const IconComponent = ACHIEVEMENT_ICONS[achievement.id] || Trophy;
              const colors = ACHIEVEMENT_COLORS[achievement.id] || ACHIEVEMENT_COLORS.first_game;
              const isHovered = hoveredAchievement === achievement.id;
              
              return (
                <div
                  key={achievement.id}
                  className="group relative"
                  onMouseEnter={() => setHoveredAchievement(achievement.id)}
                  onMouseLeave={() => setHoveredAchievement(null)}
                >
                  {/* Achievement Icon Container with holographic effect */}
                  <div className="relative">
                    {/* Glow effect */}
                    <div 
                      className={`
                        absolute inset-0 bg-gradient-to-r ${colors.bgGradient} 
                        rounded-lg blur-md opacity-0 group-hover:opacity-50 
                        transition-opacity duration-300
                      `} 
                    />
                    
                    {/* Main icon container */}
                    <div
                      className={`
                        relative w-12 h-12 rounded-lg flex items-center justify-center
                        bg-gradient-to-br ${colors.gradient} ${colors.border}
                        border backdrop-blur-sm transition-all duration-300
                        group-hover:scale-110 ${isHovered ? colors.glow : ''}
                        cursor-pointer
                      `}
                    >
                      <IconComponent 
                        className={`${colors.icon} transition-all duration-300 ${isHovered ? 'scale-110' : ''}`} 
                        size={24} 
                      />
                      
                      {/* Shimmer effect on hover */}
                      {isHovered && (
                        <div className="absolute inset-0 rounded-lg overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tooltip on hover with futuristic design */}
                  <div className={`
                    absolute bottom-full left-1/2 transform -translate-x-1/2 mb-8
                    transition-all duration-200 pointer-events-none z-20
                    ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                  `}>
                    <div className="relative">
                      {/* Tooltip glow */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${colors.bgGradient} rounded-lg blur-md opacity-50`} />
                      
                      {/* Tooltip content */}
                      <div className="relative bg-black/90 border border-white/20 rounded-lg px-3 py-2 backdrop-blur-sm">
                        <div className="font-semibold text-white text-xs whitespace-nowrap">
                          {achievement.name}
                        </div>
                        <div className="text-white/60 text-[10px] mt-0.5 font-mono">
                          {achievement.description}
                        </div>
                      </div>
                      
                      {/* Tooltip arrow */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-white/20" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Achievement Summary with tech styling */}
          <div className="relative inline-block mt-6">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur" />
            <div className="relative bg-black/50 border border-white/10 rounded-full px-3 py-1 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="text-cyan-400" size={12} />
                <p className="text-white/70 text-xs font-mono">
                  {t("profile.achievementsUnlocked", { 
                    count: unlockedAchievements.length,
                    total: achievements.length 
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