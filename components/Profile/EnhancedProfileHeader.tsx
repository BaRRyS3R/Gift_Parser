// src/components/Profile/EnhancedProfileHeader.tsx - Updated to use authService API only

"use client";

import type { User as UserType } from "@/lib/supabase";
import type { LeagueProgressInfo } from "@/lib/authService";

import React, { useState, useEffect } from "react";
import { Trophy, Star, Medal, Award, Crown } from "lucide-react";

import { useT } from "@/contexts/LocalizationContext";
import { useUser } from "@/hooks/useUser";
import { authService } from "@/lib/authService";

interface EnhancedProfileHeaderProps {
  user: UserType;
}

const EnhancedProfileHeader: React.FC<EnhancedProfileHeaderProps> = ({
  user,
}) => {
  const t = useT();
  const { isAuthenticated } = useUser();
  const [progressInfo, setProgressInfo] = useState<LeagueProgressInfo | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProgressInfo = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);

        return;
      }

      try {
        console.log(
          "EnhancedProfileHeader: Fetching league progress via authService API...",
        );

        const progress = await authService.getLeagueProgress();

        setProgressInfo(progress);
        console.log(
          "EnhancedProfileHeader: League progress fetched successfully",
        );
      } catch (error) {
        console.error(
          "EnhancedProfileHeader: Error loading league progress:",
          error,
        );

        // Handle authentication errors gracefully
        if (
          error instanceof Error &&
          error.message.includes("Authentication expired")
        ) {
          console.log(
            "EnhancedProfileHeader: Authentication expired, will not show league info",
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProgressInfo();
  }, [isAuthenticated]);

  // Get league icon and colors
  const getLeagueIcon = (leagueName: string) => {
    switch (leagueName) {
      case "bronze":
        return Trophy;
      case "silver":
        return Medal;
      case "gold":
        return Award;
      case "platinum":
        return Crown;
      case "diamond":
        return Star;
      default:
        return Trophy;
    }
  };

  const getLeagueColor = (leagueName: string) => {
    switch (leagueName) {
      case "bronze":
        return "text-orange-400";
      case "silver":
        return "text-gray-300";
      case "gold":
        return "text-yellow-400";
      case "platinum":
        return "text-purple-300";
      case "diamond":
        return "text-cyan-300";
      default:
        return "text-white";
    }
  };

  const LeagueIcon = progressInfo
    ? getLeagueIcon(progressInfo.currentLeague.name)
    : Trophy;
  const leagueColor = progressInfo
    ? getLeagueColor(progressInfo.currentLeague.name)
    : "text-white";

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

      {/* Level and League */}
      <div className="flex items-center justify-center space-x-4 mt-3">
        {isLoading ? (
          <div className="animate-pulse flex items-center space-x-2">
            <div className="w-16 h-5 bg-white/20 rounded" />
            <div className="w-px h-4 bg-white/30" />
            <div className="w-20 h-5 bg-white/20 rounded" />
          </div>
        ) : progressInfo ? (
          <>
            {/* Level */}
            <div className="flex items-center space-x-1">
              <Star className="text-white/80" size={16} />
              <span className="text-white text-sm font-semibold">
                {t("profile.levelDisplay", {
                  level: progressInfo.currentLevel,
                })}
              </span>
            </div>

            {/* Separator */}
            <div className="w-px h-5 bg-white/30" />

            {/* League */}
            <div className="flex items-center space-x-1">
              <LeagueIcon
                className={`${leagueColor} animate-pulse-gentle`}
                size={16}
              />
              <span className={`text-sm font-semibold ${leagueColor}`}>
                {t(`leagues.names.${progressInfo.currentLeague.name}` as any)}
              </span>
            </div>
          </>
        ) : (
          /* Fallback: Show basic level info from user data */
          <div className="flex items-center space-x-1">
            <Star className="text-white/80" size={16} />
            <span className="text-white text-sm font-semibold">
              {t("profile.levelDisplay", {
                level: user.current_level || 1,
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedProfileHeader;
