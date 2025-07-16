// src/components/LeagueProgress/LeagueProgressDisplay.tsx - Updated to use authService API only

"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Star, ArrowUp, Target } from "lucide-react";

import { useUser } from "@/hooks/useUser";
import { useT } from "@/contexts/LocalizationContext";
import { authService } from "@/lib/authService";
import type { LeagueProgressInfo } from "@/lib/authService";

interface LeagueProgressDisplayProps {
  className?: string;
  showLevelProgress?: boolean;
}

const LeagueProgressDisplay: React.FC<LeagueProgressDisplayProps> = ({
  className = "",
  showLevelProgress = false,
}) => {
  const { isAuthenticated } = useUser();
  const t = useT();

  const [progressInfo, setProgressInfo] = useState<LeagueProgressInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProgressInfo = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        console.log("LeagueProgressDisplay: Fetching league progress via authService API...");

        const progress = await authService.getLeagueProgress();

        setProgressInfo(progress);
        console.log("LeagueProgressDisplay: League progress fetched successfully");
      } catch (error) {
        console.error("LeagueProgressDisplay: Error loading league progress:", error);

        // Handle authentication errors gracefully
        if (error instanceof Error && error.message.includes("Authentication expired")) {
          console.log("LeagueProgressDisplay: Authentication expired, component will not render");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProgressInfo();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div
        className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 ${className}`}
      >
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-5 h-5 bg-white/20 rounded" />
            <div className="w-20 h-4 bg-white/20 rounded" />
          </div>
          <div className="w-full h-2 bg-white/20 rounded" />
        </div>
      </div>
    );
  }

  if (!progressInfo) {
    return null;
  }

  // Determine league color
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

  const leagueColor = getLeagueColor(progressInfo.currentLeague.name);
  const isMaxLeague = !progressInfo.nextLeague;

  // Calculate level progress
  const GAMES_PER_LEVEL = 10;
  const MAX_LEVEL = 100;
  const currentLevel = progressInfo.currentLevel;
  const gamesInCurrentLevel = progressInfo.totalGames % GAMES_PER_LEVEL;
  const gamesToNextLevel = GAMES_PER_LEVEL - gamesInCurrentLevel;
  const levelProgressPercent = (gamesInCurrentLevel / GAMES_PER_LEVEL) * 100;
  const isMaxLevel = currentLevel >= MAX_LEVEL;

  return (
    <div
      className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 hover:bg-white/15 transition-all duration-300 ${className}`}
    >
      {/* Header with Level and League */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Star className={`${leagueColor} animate-pulse-gentle`} size={16} />
          <span className="text-white text-sm font-bold">
            {t("leagues.level")} {progressInfo.currentLevel}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <Trophy className={leagueColor} size={14} />
          <span className={`text-xs font-medium ${leagueColor}`}>
            {t(`leagues.names.${progressInfo.currentLeague.name}` as any)}
          </span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3">
        {/* Level Progress */}
        {showLevelProgress && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-1">
                <Target className="text-white/60" size={10} />
                <span className="text-white/60 text-xs">
                  {t("leagues.level")} {currentLevel}
                </span>
              </div>

              {!isMaxLevel && (
                <div className="flex items-center space-x-1">
                  <ArrowUp className="text-white/60" size={10} />
                  <span className="text-white/60 text-xs">
                    {gamesToNextLevel}
                  </span>
                </div>
              )}
            </div>

            {/* Level Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out bg-white/60"
                style={{
                  width: `${isMaxLevel ? 100 : levelProgressPercent}%`,
                }}
              />
            </div>

            {/* Level Progress Info */}
            {!isMaxLevel && (
              <div className="text-center">
                <span className="text-white/50 text-xs">
                  {gamesToNextLevel} to level {currentLevel + 1}
                </span>
              </div>
            )}

            {isMaxLevel && (
              <div className="text-center">
                <span className="text-white/50 text-xs">
                  {t("leagues.progressDisplay.maxLevel")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* League Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-white/60 text-xs">
              {progressInfo.totalGames}{" "}
              {t("leagues.progressDisplay.gamesPlayed")}
            </span>

            {!isMaxLeague && (
              <div className="flex items-center space-x-1">
                <ArrowUp className="text-white/60" size={10} />
                <span className="text-white/60 text-xs">
                  {progressInfo.gamesToNextLeague}
                </span>
              </div>
            )}
          </div>

          {/* League Progress Bar */}
          <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${leagueColor.replace("text-", "bg-")}`}
              style={{
                width: `${isMaxLeague ? 100 : progressInfo.progressPercent}%`,
              }}
            />
          </div>

          {/* Next League Info */}
          {!isMaxLeague && progressInfo.nextLeague && (
            <div className="text-center">
              <span className="text-white/50 text-xs">
                {progressInfo.gamesToNextLeague} to{" "}
                {t(`leagues.names.${progressInfo.nextLeague.name}` as any)}
              </span>
            </div>
          )}

          {/* Max League Indicator */}
          {isMaxLeague && (
            <div className="text-center">
              <span className={`text-xs font-medium ${leagueColor}`}>
                {t("leagues.progressDisplay.inTopLeague")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeagueProgressDisplay;